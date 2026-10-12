import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BOTS, type BotConfig } from '../src/bots/catalog.ts'
import type { Biome } from '../src/lib/engine/index.ts'
import { validateSetup } from '../src/lib/engine/setup.ts'
import type { PawnKind } from '../src/lib/engine/pawns/index.ts'
import { TRAINING_ROSTERS, TRAINING_BIOMES } from './learned-matches.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { LEARNED_LEVELS, LearnedBot } from '../src/bots/strategies/learned.ts'
import type { FitOptions } from './value-fit.ts'

function readBotConfigs(value: unknown): BotConfig[] {
  if (!Array.isArray(value) || !value.length)
    throw new RangeError('Opponent lists must not be empty')
  return value.map((config: unknown) => {
    if (!config || typeof config !== 'object') throw new RangeError('Invalid bot configuration')
    const { name, options } = config as { name: string; options: unknown }
    if (!Object.hasOwn(BOTS, name) || !options || typeof options !== 'object')
      throw new RangeError('Invalid bot configuration')
    const bot = BOTS[name as keyof typeof BOTS].resolve(options)
    return { name: bot.name, options: bot.options } as BotConfig
  })
}

export type PipelineConfig = {
  output: string
  scenarios: { rosters: PawnKind[][]; biomes: Biome[] }
  training: FitOptions & {
    games: number
    maxActivations: number
    seedPrefix: string
    timeouts: 'skip' | 'draw'
    league: BotConfig[]
  }
  evaluation: {
    pairs: number
    maxActivations: number
    seedPrefix: string
    offset: number
    stride: number
    opponents: BotConfig[]
    includeIncumbent: boolean
    search: LearnedBot['options']
  }
  acceptance: {
    minScore: number
    incumbentMinScore: number
    maxTimeoutRate: number
    maxP95Ms: number
    validationImprovement: boolean
  }
}

const PIPELINE_DEFAULTS: PipelineConfig = {
  output: 'training-runs/candidate',
  scenarios: { rosters: TRAINING_ROSTERS, biomes: TRAINING_BIOMES },
  training: {
    games: 80,
    epochs: 400,
    maxActivations: 180,
    learningRate: 0.03,
    regularization: 0.001,
    validationEvery: 5,
    seedPrefix: 'value-training-v2',
    timeouts: 'skip',
    league: [
      { name: 'depthsearch', options: BOT_LEVELS.easy },
      { name: 'depthsearch', options: BOT_LEVELS.normal },
      { name: 'depthsearch', options: BOT_LEVELS.hard },
      BOTS.commander.defaultConfig,
      BOTS.random.defaultConfig,
    ],
  },
  evaluation: {
    pairs: 8,
    maxActivations: 360,
    seedPrefix: 'value-evaluation-v2',
    offset: 0,
    stride: 2,
    includeIncumbent: true,
    search: LEARNED_LEVELS.normal,
    opponents: [{ name: 'depthsearch', options: { ...BOT_LEVELS.hard, depth: 4 } }],
  },
  acceptance: {
    minScore: 0.75,
    incumbentMinScore: 0.5,
    maxTimeoutRate: 0.2,
    maxP95Ms: 500,
    validationImprovement: true,
  },
}

function merge(defaults: object, supplied: unknown): object {
  if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied))
    throw new RangeError('Configuration must be a JSON object')
  const values = supplied as Record<string, unknown>
  for (const key of Object.keys(values))
    if (!Object.hasOwn(defaults, key))
      throw new RangeError(`Unknown configuration field: ${key}`)
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const value = Object.hasOwn(values, key) ? values[key] : fallback
      return [
        key,
        typeof fallback === 'object' && !Array.isArray(fallback)
          ? merge(fallback, value)
          : structuredClone(value),
      ]
    }),
  )
}

function validatePipeline(config: PipelineConfig): void {
  if (
    !Array.isArray(config.scenarios.rosters) ||
    !config.scenarios.rosters.length ||
    !Array.isArray(config.scenarios.biomes) ||
    !config.scenarios.biomes.length
  )
    throw new RangeError('Scenario rosters and biomes must not be empty')
  for (const roster of config.scenarios.rosters)
    for (const biome of config.scenarios.biomes)
      validateSetup({ biome, player: roster, enemy: roster })
  const integer = (value: number, min: number, name: string) => {
    if (!Number.isSafeInteger(value) || value < min) throw new RangeError(`Invalid ${name}`)
  }
  const positive = (value: number, name: string) => {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`Invalid ${name}`)
  }
  for (const [name, value] of Object.entries({
    games: config.training.games,
    epochs: config.training.epochs,
    validationEvery: config.training.validationEvery,
    trainingTurns: config.training.maxActivations,
    pairs: config.evaluation.pairs,
    evaluationTurns: config.evaluation.maxActivations,
    stride: config.evaluation.stride,
  }))
    integer(value, name === 'validationEvery' || name === 'games' ? 2 : 1, name)
  integer(config.evaluation.offset, 0, 'offset')
  if (config.training.games < config.training.validationEvery)
    throw new RangeError('Not enough games for validation split')
  positive(config.training.learningRate, 'learningRate')
  if (!Number.isFinite(config.training.regularization) || config.training.regularization < 0)
    throw new RangeError('Invalid regularization')
  positive(config.acceptance.maxP95Ms, 'maxP95Ms')
  for (const value of [
    config.acceptance.minScore,
    config.acceptance.incumbentMinScore,
    config.acceptance.maxTimeoutRate,
  ])
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new RangeError('Acceptance rates must be between 0 and 1')
  for (const prefix of [
    config.training.seedPrefix,
    config.evaluation.seedPrefix,
    config.output,
  ])
    if (typeof prefix !== 'string' || !prefix.trim())
      throw new RangeError('Output and seed prefixes must be nonempty')
  if (config.training.seedPrefix === config.evaluation.seedPrefix)
    throw new RangeError('Training and evaluation seeds must be separate')
  if (!['skip', 'draw'].includes(config.training.timeouts))
    throw new RangeError('Invalid timeout treatment')
  if (
    typeof config.evaluation.includeIncumbent !== 'boolean' ||
    typeof config.acceptance.validationImprovement !== 'boolean'
  )
    throw new RangeError('Invalid boolean configuration')
  for (const league of [config.training.league, config.evaluation.opponents]) {
    readBotConfigs(league)
  }
  new LearnedBot(config.evaluation.search)
}

// --section.field=value overrides any scalar; arrays/objects are supplied through --config.
export function readPipelineConfig(args = process.argv.slice(2)): PipelineConfig {
  const files = args.filter((arg) => arg.startsWith('--config='))
  if (files.length > 1) throw new RangeError('Use one --config=<path>')
  const config = merge(
    PIPELINE_DEFAULTS,
    files.length ? JSON.parse(readFileSync(resolve(files[0].slice(9)), 'utf8')) : {},
  ) as PipelineConfig
  for (const arg of args.filter((value) => !value.startsWith('--config='))) {
    const match = /^--([\w.]+)=(.+)$/.exec(arg)
    if (!match) throw new RangeError(`Expected --section.field=value: ${arg}`)
    const fields = match[1].split('.'),
      last = fields.pop()!
    let target = config as unknown as Record<string, unknown>
    for (const field of fields) {
      if (!target[field] || typeof target[field] !== 'object' || Array.isArray(target[field]))
        throw new RangeError(`Unknown option ${match[1]}`)
      target = target[field] as Record<string, unknown>
    }
    if (!Object.hasOwn(target, last) || typeof target[last] === 'object')
      throw new RangeError(`Unknown scalar option ${match[1]}`)
    target[last] = typeof target[last] === 'string' ? match[2] : JSON.parse(match[2])
  }
  validatePipeline(config)
  return config
}
