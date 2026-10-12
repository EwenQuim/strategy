import type { Bot } from './bot.ts'
import { BOT_LEVELS } from '../lib/engine/ai.ts'
import { registerBot } from './registration.ts'
import { DepthsearchBot } from './strategies/depthsearch.ts'
import { RandomBot } from './strategies/random.ts'
import { MistralBot } from './strategies/mistral.ts'
import { JevBot } from './strategies/jev.ts'
import { CommanderBot, COMMANDER_LEVELS } from './strategies/commander.ts'
import { LearnedBot, LEARNED_LEVELS } from './strategies/learned.ts'

const depthsearch = registerBot(DepthsearchBot, undefined, BOT_LEVELS)
const random = registerBot(RandomBot)
const mistral = registerBot(MistralBot, new DepthsearchBot())
const jev = registerBot(JevBot, new DepthsearchBot())
const commander = registerBot(CommanderBot, undefined, COMMANDER_LEVELS)
const learned = registerBot(LearnedBot, undefined, LEARNED_LEVELS)

export const BOTS = {
  [learned.name]: learned,
  [commander.name]: commander,
  [depthsearch.name]: depthsearch,
  [random.name]: random,
  [mistral.name]: mistral,
  [jev.name]: jev,
}

export type BotName = keyof typeof BOTS
export type BotConfig = (typeof BOTS)[BotName]['defaultConfig']
export const DEFAULT_BOT_CONFIG: BotConfig = commander.defaultConfig

export function getBot(config: BotConfig): Bot {
  return BOTS[config.name].resolve(config.options)
}

// Validate unknown URL data through the same constructors used by the application.
export function parseBotConfig(value: unknown): BotConfig {
  try {
    if (typeof value !== 'object' || value === null) return DEFAULT_BOT_CONFIG
    const { name, options } = value as Record<string, unknown>
    if (typeof name !== 'string' || !Object.hasOwn(BOTS, name) || options === undefined)
      return DEFAULT_BOT_CONFIG
    const bot = BOTS[name as BotName].resolve(options)
    return { name: bot.name, options: bot.options } as BotConfig
  } catch {
    return DEFAULT_BOT_CONFIG
  }
}
