import { BOT_LEVELS, type Bot, type BotDifficulty } from './lib/engine/ai.ts'
import { withFallback } from './lib/engine/bot.ts'
import { depthsearch } from './lib/engine/ai/strategies/depthsearch.ts'
import { random } from './lib/engine/ai/strategies/random.ts'
import type { GameSearch } from './lib/game-mode.ts'
import { mistralBot } from './api/mistralBot.ts'
import { jevBot } from './api/jevBot.ts'

// The only place bots have names: URLs, saved battles and menus refer to a bot through its
// BotConfig, and createBot turns that config into the Bot the engine plays. Adding a bot is one
// entry in BOTS; the engine only ever sees the Bot.
const DEPTHSEARCH = {
  easy: depthsearch(BOT_LEVELS.easy),
  normal: depthsearch(BOT_LEVELS.normal),
  hard: depthsearch(BOT_LEVELS.hard),
} satisfies Record<BotDifficulty, Bot>

const BOTS = {
  random,
  mistral: withFallback(mistralBot, DEPTHSEARCH.normal),
  jev: withFallback(jevBot, DEPTHSEARCH.normal),
} satisfies Record<string, Bot>

export type BotName = 'depthsearch' | keyof typeof BOTS

export type BotConfig =
  { name: 'depthsearch'; difficulty: BotDifficulty } | { name: keyof typeof BOTS }

export const DEFAULT_BOT_CONFIG: BotConfig = { name: 'depthsearch', difficulty: 'normal' }

export function createBot(config: BotConfig): Bot {
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
