import type { Bot } from './bot.ts'
import { BOT_LEVELS } from '../lib/engine/ai.ts'
import { registerBot } from './registration.ts'
import { DepthsearchBot } from './strategies/depthsearch.ts'
import { RandomBot } from './strategies/random.ts'
import { MistralBot } from './strategies/mistral.ts'
import { JevBot } from './strategies/jev.ts'
import { NapoleonBot, NAPOLEON_LEVELS } from './strategies/napoleon.ts'
import { HannibalBot, HANNIBAL_LEVELS } from './strategies/hannibal.ts'

const depthsearch = registerBot(DepthsearchBot, undefined, BOT_LEVELS)
const random = registerBot(RandomBot)
const mistral = registerBot(MistralBot, new DepthsearchBot())
const jev = registerBot(JevBot, new DepthsearchBot())
const napoleon = registerBot(NapoleonBot, undefined, NAPOLEON_LEVELS)
const hannibal = registerBot(HannibalBot, undefined, HANNIBAL_LEVELS)

export const BOTS = {
  [hannibal.name]: hannibal,
  [napoleon.name]: napoleon,
  [depthsearch.name]: depthsearch,
  [random.name]: random,
  [mistral.name]: mistral,
  [jev.name]: jev,
}

export type BotName = keyof typeof BOTS
export type BotConfig = (typeof BOTS)[BotName]['defaultConfig']
export const DEFAULT_BOT_CONFIG: BotConfig = napoleon.defaultConfig

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
