import type { Bot } from './bot.ts'
import { BOT_LEVELS } from '../lib/engine/ai.ts'
import { registerBot } from './registration.ts'
import { DepthsearchBot } from './strategies/depthsearch.ts'
import { RandomBot } from './strategies/random.ts'
import { MistralBot } from './strategies/mistral.ts'
import { JevBot } from './strategies/jev.ts'
import { NapoleonBot, NAPOLEON_LEVELS } from './strategies/napoleon.ts'
import { HannibalBot, HANNIBAL_LEVELS } from './strategies/hannibal.ts'
import { CaesarBot, CAESAR_LEVELS } from './strategies/caesar.ts'
import { BelisariusBot, BELISARIUS_LEVELS } from './strategies/belisarius.ts'

const depthsearch = registerBot(DepthsearchBot, undefined, BOT_LEVELS)
const random = registerBot(RandomBot)
const mistral = registerBot(MistralBot, new DepthsearchBot(), {}, 'main')
const jev = registerBot(JevBot, new DepthsearchBot(), {}, 'main')
const napoleon = registerBot(NapoleonBot, undefined, NAPOLEON_LEVELS)
const hannibal = registerBot(HannibalBot, undefined, HANNIBAL_LEVELS)
const caesar = registerBot(CaesarBot, undefined, CAESAR_LEVELS)
const belisarius = registerBot(BelisariusBot, undefined, BELISARIUS_LEVELS)

export const BOTS = {
  [random.name]: random,
  [depthsearch.name]: depthsearch,
  [napoleon.name]: napoleon,
  [hannibal.name]: hannibal,
  [caesar.name]: caesar,
  [belisarius.name]: belisarius,
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
