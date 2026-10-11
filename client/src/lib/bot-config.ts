import { BOT_LEVELS, type BotOptions } from './engine/ai.ts'
import type { LocalBotConfig } from './engine/ai/decision.ts'

export { DEFAULT_BOT_CONFIG } from './engine/ai/decision.ts'

// Serializable identities for URLs and saved battles, independent of bot implementations.
export const BOT_NAMES = ['depthsearch', 'random', 'mistral', 'jev'] as const
export type AiStrategyId = (typeof BOT_NAMES)[number]

// Remote adapters own their fallback, which plays the local search at normal difficulty.
export type BotConfig = LocalBotConfig | { name: Exclude<AiStrategyId, LocalBotConfig['name']> }

export function botOptions(config: BotConfig): BotOptions {
  return config.name === 'depthsearch' ? BOT_LEVELS[config.difficulty] : BOT_LEVELS.normal
}
