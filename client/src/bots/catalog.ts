import { BOT_LEVELS, type BotDifficulty } from '../lib/engine/ai.ts'
import { withFallback, type Bot } from './bot.ts'
import { DepthsearchBot } from './strategies/depthsearch.ts'
import { RandomBot } from './strategies/random.ts'
import { MistralBot } from './strategies/mistral.ts'
import { JevBot } from './strategies/jev.ts'
import type { GameSearch } from '../lib/game-mode.ts'

// BotConfig is the serializable description for URLs and saves; getBot resolves it to a
// stable named object with its own chooseActions method. Names belong to the implementations.
const DEPTHSEARCH = {
  easy: new DepthsearchBot(BOT_LEVELS.easy),
  normal: new DepthsearchBot(BOT_LEVELS.normal),
  hard: new DepthsearchBot(BOT_LEVELS.hard),
} satisfies Record<BotDifficulty, Bot>

const random = new RandomBot()
const mistral = withFallback(new MistralBot(), DEPTHSEARCH.normal)
const jev = withFallback(new JevBot(), DEPTHSEARCH.normal)

const BOTS = {
  [random.name]: random,
  [mistral.name]: mistral,
  [jev.name]: jev,
} satisfies Record<string, Bot>

export type BotName = DepthsearchBot['name'] | keyof typeof BOTS

export type BotConfig =
  { name: DepthsearchBot['name']; difficulty: BotDifficulty } | { name: keyof typeof BOTS }

export const DEFAULT_BOT_CONFIG: BotConfig = { name: 'depthsearch', difficulty: 'normal' }

export function getBot(config: BotConfig): Bot {
  return config.name === 'depthsearch' ? DEPTHSEARCH[config.difficulty] : BOTS[config.name]
}

// The URL keeps its two plain params (?difficulty=hard, ?strategy=mistral) for shareable
// links; the app folds them into one bot description at the route boundary.
export function botFromSearch(search: GameSearch): BotConfig {
  if (search.strategy && Object.hasOwn(BOTS, search.strategy))
    return { name: search.strategy as keyof typeof BOTS }
  return { name: 'depthsearch', difficulty: search.difficulty ?? 'normal' }
}

export function searchFromBot(bot: BotConfig): Pick<GameSearch, 'difficulty' | 'strategy'> {
  return bot.name === 'depthsearch' ? { difficulty: bot.difficulty } : { strategy: bot.name }
}
