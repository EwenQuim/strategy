import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { activePawn, reducer } from '../src/lib/engine/index.ts'
import { getBot } from '../src/bots/catalog.ts'
import { LearnedBot } from '../src/bots/strategies/learned.ts'
import { BASELINE_WEIGHTS } from '../src/bots/valueModel.ts'
import { valueFeatures, VALUE_FEATURES } from '../src/bots/valueFeatures.ts'
import type { Bot } from '../src/bots/bot.ts'
import { trainingBattle } from './learned-matches.ts'
import { fitValue, type Sample } from './value-fit.ts'
import type { PipelineConfig } from './value-config.ts'

export function acceptanceFailures(
  config: PipelineConfig,
  candidate: {
    baselineValidationLoss: number
    validationLoss: number
  },
  results: { score: number; timeoutRate: number; p95Ms: number; opponent: string }[],
): string[] {
  const failures: string[] = []
  if (
    config.acceptance.validationImprovement &&
    !(candidate.validationLoss < candidate.baselineValidationLoss)
  )
    failures.push('Validation loss did not improve')
  for (const result of results) {
    const minimum =
      result.opponent === 'incumbent'
        ? config.acceptance.incumbentMinScore
        : config.acceptance.minScore
    if (result.score < minimum) failures.push(`${result.opponent}: score below threshold`)
    if (result.timeoutRate > config.acceptance.maxTimeoutRate)
      failures.push(`${result.opponent}: too many timeouts`)
    if (result.p95Ms > config.acceptance.maxP95Ms)
      failures.push(`${result.opponent}: latency above threshold`)
  }
  if (!results.length) failures.push('No evaluation results')
  return failures
}

async function evaluate(
  config: PipelineConfig,
  weights: readonly number[],
  opponent: Bot,
  label: string,
) {
  const options = config.evaluation
  let wins = 0,
    losses = 0,
    draws = 0,
    timeouts = 0
  const times: number[] = []
  const matches: object[] = []
  for (let pair = 0; pair < options.pairs; pair++) {
    for (const side of ['player', 'enemy'] as const) {
      const scenario = pair * options.stride + options.offset
      const seed = `${options.seedPrefix}-${scenario}`
      let state = trainingBattle(
        seed,
        scenario,
        config.scenarios.rosters,
        config.scenarios.biomes,
      )
      const bot = new LearnedBot(options.search, weights)
      for (let turn = 0; turn < options.maxActivations && !state.winner; turn++) {
        const ours = activePawn(state)!.side === side
        const before = performance.now()
        const actions = await (ours ? bot : opponent).chooseActions(state)
        if (ours) times.push(performance.now() - before)
        if (!actions.length) throw new Error('Evaluation bot failed to act')
        for (const action of actions) {
          const next = reducer(state, action)
          if (next === state) throw new Error('Illegal evaluation action')
          state = next
        }
      }
      if (state.winner === side) wins++
      else if (state.winner === 'draw') draws++
      else if (state.winner) losses++
      else timeouts++
      matches.push({ seed, side, winner: state.winner, round: state.round })
      console.log(`${label}: ${seed} candidate ${side}: ${state.winner ?? 'timeout'}`)
    }
  }
  times.sort((a, b) => a - b)
  return {
    opponent: label,
    wins,
    losses,
    draws,
    timeouts,
    // Unfinished games receive no win credit; they are not established draws.
    score: (wins + draws * 0.5) / (options.pairs * 2),
    timeoutRate: timeouts / (options.pairs * 2),
    p95Ms: times[Math.ceil(times.length * 0.95) - 1] ?? 0,
    worstMs: times.at(-1) ?? 0,
    matches,
  }
}

export async function runValuePipeline(config: PipelineConfig) {
  const directory = resolve(config.output)
  if (existsSync(directory))
    throw new Error(`Run directory already exists: ${directory}; use --output=<new-path>`)
  mkdirSync(directory, { recursive: true })
  const write = (name: string, data: unknown) =>
    writeFileSync(join(directory, name), JSON.stringify(data, null, 2) + '\n')
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const dirty =
    execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0
  const patch = execFileSync('git', ['diff', 'HEAD'], { encoding: 'utf8' })
  write('config.json', config)
  write('provenance.json', {
    commit,
    dirty,
    patchSha256: createHash('sha256').update(patch).digest('hex'),
    features: VALUE_FEATURES,
  })
  const league = config.training.league.map(getBot)
  const samples: Sample[] = []
  let completed = 0,
    timeouts = 0
  const started = performance.now()
  for (let game = 0; game < config.training.games; game++) {
    let state = trainingBattle(
      `${config.training.seedPrefix}-${game}`,
      game,
      config.scenarios.rosters,
      config.scenarios.biomes,
    )
    const positions: number[][] = []
    const cache = { reach: new Map() }
    const player = league[game % league.length]
    const enemy = league[(Math.floor(game / league.length) + game + 1) % league.length]
    for (let turn = 0; turn < config.training.maxActivations && !state.winner; turn++) {
      positions.push(valueFeatures(state, 'player', cache))
      const actions = await (
        activePawn(state)!.side === 'player' ? player : enemy
      ).chooseActions(state)
      if (!actions.length) throw new Error('Training bot failed to act')
      for (const action of actions) {
        const next = reducer(state, action)
        if (next === state) throw new Error('Illegal training action')
        state = next
      }
    }
    if (state.winner) completed++
    else timeouts++
    if (state.winner || config.training.timeouts === 'draw') {
      const label =
        !state.winner || state.winner === 'draw' ? 0.5 : state.winner === 'player' ? 1 : 0
      for (const features of positions) samples.push({ features, label, game })
    }
    console.log(
      `Training ${game + 1}/${config.training.games}: ${state.winner ?? 'timeout'}, ${positions.length} positions`,
    )
  }
  write('samples.json', samples)
  const fitted = fitValue(samples, BASELINE_WEIGHTS, config.training)
  const candidate = {
    version: 1,
    trainingGames: config.training.games,
    completedGames: completed,
    timeouts,
    positions: samples.length,
    features: VALUE_FEATURES,
    trainingPrefix: config.training.seedPrefix,
    commit,
    ...fitted,
  }
  write('candidate.json', candidate)
  const trainingMs = performance.now() - started
  const results = []
  for (const opponent of config.evaluation.opponents)
    results.push(
      await evaluate(config, candidate.weights, getBot(opponent), JSON.stringify(opponent)),
    )
  if (config.evaluation.includeIncumbent)
    results.push(
      await evaluate(
        config,
        candidate.weights,
        new LearnedBot(config.evaluation.search),
        'incumbent',
      ),
    )
  const failures = acceptanceFailures(config, candidate, results)
  const report = {
    accepted: !failures.length,
    failures,
    trainingMs,
    totalMs: performance.now() - started,
    candidate: 'candidate.json',
    results,
  }
  write('report.json', report)
  console.log(JSON.stringify(report, null, 2))
  return report
}
