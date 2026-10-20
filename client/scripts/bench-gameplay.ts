import { readFileSync, writeFileSync } from 'node:fs'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { BIOMES, PAWN_CLASSES } from '../src/lib/engine/index.ts'
import {
  DEFAULT_EXPERIMENT,
  experimentStarts,
  makeBot,
  playExperiment,
  provenance,
  type ExperimentConfig,
  type ExperimentMatch,
  type Substitution,
} from './gameplay-experiment.ts'
import { experimentReport, pairedComparison } from './gameplay-report.ts'

type Task = {
  metadata: Pick<
    ExperimentMatch,
    'id' | 'seed' | 'biome' | 'roster' | 'playerBot' | 'enemyBot' | 'probe'
  >
  start: ExperimentMatch['start']
  player: ExperimentConfig['bots'][number]
  enemy: ExperimentConfig['bots'][number]
}
type Work = { tasks: Task[]; maxRounds: number; substitution?: Substitution }
type Run = {
  version: number
  config: ExperimentConfig
  provenance: ReturnType<typeof provenance>
  substitution?: Substitution
  matches: ExperimentMatch[]
}

async function run(work: Work) {
  const matches: ExperimentMatch[] = []
  for (const task of work.tasks)
    matches.push(
      await playExperiment(
        task.metadata,
        task.start,
        makeBot(task.player),
        makeBot(task.enemy),
        work.maxRounds,
        work.substitution,
      ),
    )
  return matches
}

if (!isMainThread) {
  parentPort!.postMessage(await run(workerData as Work))
} else {
  const args = process.argv.slice(2)
  const flag = (name: string) =>
    args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
  const baselinePath = flag('baseline')
  const baseline: Run | undefined = baselinePath
    ? JSON.parse(readFileSync(baselinePath, 'utf8'))
    : undefined
  const config: ExperimentConfig = flag('config')
    ? JSON.parse(readFileSync(flag('config')!, 'utf8'))
    : structuredClone(baseline?.config ?? DEFAULT_EXPERIMENT)
  const positional = args.filter((a) => !a.startsWith('--'))
  if (positional.length) config.seeds = positional
  if (flag('seeds'))
    config.seeds = Array.from({ length: Number(flag('seeds')) }, (_, i) => `gameplay-${i}`)
  if (flag('biomes')) config.biomes = flag('biomes')!.split(',') as ExperimentConfig['biomes']
  if (flag('bots'))
    config.bots = config.bots.filter((b) => flag('bots')!.split(',').includes(b.name))
  if (flag('max-rounds')) config.maxRounds = Number(flag('max-rounds'))
  const jobs = Number(flag('jobs') ?? 1)
  if (
    !Number.isInteger(jobs) ||
    jobs < 1 ||
    jobs > 16 ||
    !Number.isInteger(config.maxRounds) ||
    config.maxRounds < 1 ||
    !config.seeds.length ||
    !config.biomes.length ||
    !config.rosters.length ||
    !config.bots.length
  )
    throw new Error('Invalid experiment dimensions, round limit or worker count')
  for (const biome of config.biomes)
    if (!(biome in BIOMES)) throw new Error(`Unknown biome ${biome}`)
  for (const roster of config.rosters) {
    if (
      roster.units.filter((u) => u === 'king').length !== 1 ||
      roster.units.some((u) => !(u in PAWN_CLASSES))
    )
      throw new Error(`Invalid roster ${roster.name}`)
  }
  let substitution: Substitution | undefined
  if (flag('substitute')) {
    const [from, to, side = 'player'] = flag('substitute')!.split(':')
    if (
      !(from! in PAWN_CLASSES) ||
      !(to! in PAWN_CLASSES) ||
      !['player', 'enemy'].includes(side) ||
      from === 'king' ||
      to === 'king'
    )
      throw new Error('Use --substitute=from:to:player|enemy with non-king units')
    substitution = { from, to, side } as Substitution
    if (!baseline)
      throw new Error('Substitutions require a baseline with saved starting positions')
  }
  const source = provenance()
  if (
    baseline &&
    (baseline.version !== 2 ||
      JSON.stringify(config) !== JSON.stringify(baseline.config) ||
      source.botSource !== baseline.provenance.botSource)
  )
    throw new Error('Baseline schema, configuration or bot source differs')
  const tasks: Task[] = []
  if (baseline) {
    for (const match of baseline.matches) {
      const player = config.bots.find((b) => b.name === match.playerBot)!
      const enemy = config.bots.find((b) => b.name === match.enemyBot)!
      tasks.push({
        metadata: {
          id: match.id,
          seed: match.seed,
          biome: match.biome,
          roster: match.roster,
          playerBot: match.playerBot,
          enemyBot: match.enemyBot,
          probe: match.probe,
        },
        start: match.start,
        player,
        enemy,
      })
    }
  } else
    for (const position of experimentStarts(config))
      for (const player of config.bots)
        for (const enemy of config.bots) {
          if (player.config === 'turtle' && enemy.config === 'turtle') continue
          tasks.push({
            metadata: {
              id: `${position.seed}/${position.biome}/${position.roster}/${player.name}/${enemy.name}`,
              seed: position.seed,
              biome: position.biome,
              roster: position.roster,
              playerBot: player.name,
              enemyBot: enemy.name,
              probe: player.config === 'turtle' || enemy.config === 'turtle',
            },
            start: position.start,
            player,
            enemy,
          })
        }
  console.error(
    `Playing ${tasks.length} matches on ${jobs} workers${substitution ? ` (${substitution.from} -> ${substitution.to}, ${substitution.side})` : ''}`,
  )
  const matches =
    jobs === 1
      ? await run({ tasks, maxRounds: config.maxRounds, substitution })
      : (
          await Promise.all(
            Array.from(
              { length: jobs },
              (_, index) =>
                new Promise<ExperimentMatch[]>((resolve, reject) => {
                  const worker = new Worker(new URL(import.meta.url), {
                    workerData: {
                      tasks: tasks.filter((_task, i) => i % jobs === index),
                      maxRounds: config.maxRounds,
                      substitution,
                    } satisfies Work,
                  })
                  worker.once('message', resolve)
                  worker.once('error', reject)
                  worker.once('exit', (code) => {
                    if (code !== 0) reject(new Error(`Worker exited ${code}`))
                  })
                }),
            ),
          )
        )
          .flat()
          .sort((a, b) => a.id.localeCompare(b.id))
  const output = {
    version: 2,
    config,
    provenance: source,
    substitution,
    report: experimentReport(matches),
    comparison: baseline
      ? pairedComparison(baseline.matches, matches, substitution)
      : undefined,
    matches,
  }
  if (flag('output')) writeFileSync(flag('output')!, JSON.stringify(output, null, 2) + '\n')
  if (args.includes('--json')) console.log(JSON.stringify(output, null, 2))
  else
    console.log(
      JSON.stringify(
        {
          ordinary: output.report.ordinary,
          probes: output.report.probes,
          comparison: output.comparison
            ? { ordinary: output.comparison.ordinary, probes: output.comparison.probes }
            : undefined,
        },
        null,
        2,
      ),
    )
}
