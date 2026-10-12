import type { Bot } from './bot.ts'
import { BOT_LEVELS } from '../lib/engine/ai.ts'
import { registerBot } from './registration.ts'
import { DepthsearchBot } from './strategies/depthsearch.ts'
import { RandomBot } from './strategies/random.ts'
import { MistralBot } from './strategies/mistral.ts'
import { JevBot } from './strategies/jev.ts'
import type { GameSearch } from '../lib/game-mode.ts'

const depthsearch = registerBot(DepthsearchBot, undefined, BOT_LEVELS)
const random = registerBot(RandomBot)
const mistral = registerBot(MistralBot, new DepthsearchBot())
const jev = registerBot(JevBot, new DepthsearchBot())

export const BOTS = {
  [depthsearch.name]: depthsearch,
  [random.name]: random,
  [mistral.name]: mistral,
  [jev.name]: jev,
}

export type BotName = keyof typeof BOTS
export type BotConfig = (typeof BOTS)[BotName]['defaultConfig']
export const DEFAULT_BOT_CONFIG: BotConfig = depthsearch.defaultConfig

export function getBot(config: BotConfig): Bot {
  return BOTS[config.name].resolve(config.options)
}

export function configFromBot<B extends Bot>(bot: B): Pick<B, 'name' | 'options'> {
  return { name: bot.name, options: bot.options }
}

// Validate unknown URL data through the same constructors used by the application.
export function parseBotConfig(value: unknown): BotConfig {
  try {
    if (typeof value !== 'object' || value === null) return DEFAULT_BOT_CONFIG
    const { name, options } = value as Record<string, unknown>
    if (typeof name !== 'string' || !Object.hasOwn(BOTS, name)) return DEFAULT_BOT_CONFIG
    if (options === undefined) {
      const { difficulty } = value as Record<string, unknown>
      return legacyBotConfig(name, difficulty)
    }
    return configFromBot(BOTS[name as BotName].resolve(options)) as BotConfig
  } catch {
    return DEFAULT_BOT_CONFIG
  }
}

// A single structured URL parameter carries the entire bot, regardless of strategy.
// Older ?difficulty=hard / ?strategy=mistral links are decoded only at this boundary.
export function botFromSearch(search: GameSearch): BotConfig {
  if (search.bot !== undefined) return parseBotConfig(search.bot)
  return legacyBotConfig(search.strategy, search.difficulty)
}

export function searchFromBot(bot: BotConfig): Pick<GameSearch, 'bot'> {
  return { bot }
}

function legacyBotConfig(name: unknown, difficulty: unknown): BotConfig {
  const registration =
    typeof name === 'string' && Object.hasOwn(BOTS, name)
      ? BOTS[name as BotName]
      : BOTS[DEFAULT_BOT_CONFIG.name]
  const options =
    typeof difficulty === 'string' && Object.hasOwn(registration.presets, difficulty)
      ? registration.presets[difficulty]
      : registration.defaultConfig.options
  return configFromBot(registration.resolve(options)) as BotConfig
}
