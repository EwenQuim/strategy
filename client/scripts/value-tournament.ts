import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { getBot, type BotConfig } from '../src/bots/catalog.ts'
import { LearnedBot } from '../src/bots/strategies/learned.ts'
import type { PipelineConfig } from './value-config.ts'
import { trainingBattle } from './learned-matches.ts'
import { openRun, readCheckpoint, readJson, writeJson } from './value-artifacts.ts'
import { percentile, playValueMatch } from './value-matches.ts'

type MatchRecord = {
  opponent: string
  scenario: number
  side: 'player' | 'enemy'
  winner: 'player' | 'enemy' | 'draw' | null
  activations: number
  round: number
  elapsedMs: number
  candidateTimes: number[]
  opponentTimes: number[]
}

export function tournamentSummary(matches: readonly MatchRecord[]) {
  const wins = matches.filter((match) => match.winner === match.side).length
  const draws = matches.filter((match) => match.winner === 'draw').length
  const timeouts = matches.filter((match) => !match.winner).length
  const times = matches.flatMap((match) => match.candidateTimes)
  const opponentTimes = matches.flatMap((match) => match.opponentTimes)
  // Pair-level standard error: sides of the same scenario are not independent observations.
  const pairs = new Map<number, number[]>()
  for (const match of matches) {
    const scores = pairs.get(match.scenario) ?? []
    scores.push(match.winner === match.side ? 1 : match.winner === 'draw' ? 0.5 : 0)
    pairs.set(match.scenario, scores)
  }
  const scores = [...pairs.values()]
    .filter((pair) => pair.length === 2)
    .map((pair) => (pair[0] + pair[1]) / 2)
  const mean = scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length)
  const variance =
    scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / Math.max(1, scores.length - 1)
  const margin = 1.96 * Math.sqrt(variance / Math.max(1, scores.length))
  return {
    games: matches.length,
    wins,
    losses: matches.length - wins - draws - timeouts,
    draws,
    timeouts,
    score: (wins + draws * 0.5) / Math.max(1, matches.length),
    pairedApprox95: [Math.max(0, mean - margin), Math.min(1, mean + margin)],
    completedPairs: scores.length,
    timeoutRate: timeouts / Math.max(1, matches.length),
    p95Ms: percentile(times, 0.95),
    worstMs: Math.max(0, ...times),
    opponentP95Ms: percentile(opponentTimes, 0.95),
    opponentWorstMs: Math.max(0, ...opponentTimes),
  }
}

export async function evaluateValueCandidate(
  config: PipelineConfig,
  candidatePath: string,
  resume: boolean,
  deadline: number,
  referencePath?: string,
) {
  const weights = readCheckpoint(candidatePath)
  const reference = referencePath ? readCheckpoint(referencePath) : undefined
  const opponents: { label: string; config: BotConfig; weights?: readonly number[] }[] =
    config.evaluation.opponents.map((opponent) => ({
      label: JSON.stringify(opponent),
      config: opponent,
    }))
  if (config.evaluation.includeIncumbent)
    opponents.unshift({
      label: 'incumbent',
      config: { name: 'learned', options: config.evaluation.search },
      weights: reference,
    })
  const settings = {
    evaluation: config.evaluation,
    scenarios: config.scenarios,
    weights,
    reference,
  }
  const directory = openRun(config.output, 'tournament', settings, resume)
  const matches: MatchRecord[] = []
  outer: for (let pair = 0; pair < config.evaluation.pairs; pair++) {
    for (const [index, opponent] of opponents.entries()) {
      for (const side of ['player', 'enemy'] as const) {
        const path = join(directory, `match-${pair}-${index}-${side}.json`)
        if (existsSync(path)) {
          matches.push(readJson<MatchRecord>(path))
          continue
        }
        if (Date.now() >= deadline) break outer
        const scenario = pair * config.evaluation.stride + config.evaluation.offset
        const opening = trainingBattle(
          `${config.evaluation.seedPrefix}-${scenario}`,
          scenario,
          config.scenarios.rosters,
          config.scenarios.biomes,
        )
        const candidate = new LearnedBot(config.evaluation.search, weights)
        const rival =
          opponent.config.name === 'learned' && opponent.weights
            ? new LearnedBot(opponent.config.options, opponent.weights)
            : getBot(opponent.config)
        const result = await playValueMatch(
          opening,
          side === 'player' ? candidate : rival,
          side === 'enemy' ? candidate : rival,
          config.evaluation.maxActivations,
        )
        const match: MatchRecord = {
          opponent: opponent.label,
          scenario,
          side,
          winner: result.winner,
          activations: result.activations,
          round: result.round,
          elapsedMs: result.elapsedMs,
          candidateTimes: result.times[side],
          opponentTimes: result.times[side === 'player' ? 'enemy' : 'player'],
        }
        writeJson(path, match)
        matches.push(match)
        console.log(
          `${opponent.label} scenario ${scenario} candidate ${side}: ${match.winner ?? 'timeout'} ${(match.elapsedMs / 1000).toFixed(1)}s`,
        )
        writeJson(join(directory, 'report.json'), {
          complete: false,
          results: opponents.map((rivalEntry) => ({
            opponent: rivalEntry.label,
            ...tournamentSummary(
              matches.filter((entry) => entry.opponent === rivalEntry.label),
            ),
          })),
        })
      }
    }
  }
  const report = {
    complete: matches.length === opponents.length * config.evaluation.pairs * 2,
    results: opponents.map((opponent) => ({
      opponent: opponent.label,
      ...tournamentSummary(matches.filter((match) => match.opponent === opponent.label)),
    })),
  }
  writeJson(join(directory, 'report.json'), report)
  console.log(JSON.stringify(report, null, 2))
  return report
}
