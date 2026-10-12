import { BOT_LEVELS, type BotDifficulty } from '../lib/engine/ai.ts'
import { withFallback, type Bot } from './bot.ts'
import { depthsearch } from './strategies/depthsearch.ts'
import { random } from './strategies/random.ts'
import { mistral } from './strategies/mistral.ts'
import { jev } from './strategies/jev.ts'
import type { GameSearch } from '../lib/game-mode.ts'

// The only place bots have names: URLs, saved battles and menus refer to a bot through its
// BotConfig, and createBot turns that config into the Bot the app plays. Adding a bot is one
// factory in strategies/ plus one entry here; the engine never imports bots.
const DEPTHSEARCH = {
  easy: depthsearch(BOT_LEVELS.easy),
  normal: depthsearch(BOT_LEVELS.normal),
  hard: depthsearch(BOT_LEVELS.hard),
} satisfies Record<BotDifficulty, Bot>

const BOTS = {
  random: random(),
  mistral: withFallback(mistral(), DEPTHSEARCH.normal),
  jev: withFallback(jev(), DEPTHSEARCH.normal),
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
