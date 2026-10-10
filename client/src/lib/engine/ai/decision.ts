import type { Action, GameState } from '../engine.ts'
import { BOT_LEVELS, type BotDifficulty, type BotOptions } from '../ai.ts'
import { depthsearch } from './strategies/depthsearch.ts'
import { random } from './strategies/random.ts'

// A thinking system: it proposes the actions for one decision of the side it plays, under the
// shared difficulty options. A strategy may reuse the toolbox beside this file — turn
// enumeration (turns.ts), legal single actions (options.ts), position evaluation (evaluate.ts),
// tie-breaking (choice.ts), stance planning (plan.ts) — or ignore all of it and think its own way.
export type AiStrategy = (state: GameState, options: BotOptions) => Promise<Action[]>

// Adding a strategy is a new file in strategies/ plus one import and one entry here; the key
// union keeps every lookup in STRATEGIES checked against the registered names.
// Remote strategies need the network, so the app swaps in their adapter (src/api/useGame.ts);
// inside the engine they play the local search.
export const STRATEGIES = {
  depthsearch,
  random,
  mistral: depthsearch,
  jev: depthsearch,
} as const satisfies Record<string, AiStrategy>

export type AiStrategyId = keyof typeof STRATEGIES

// The whole description of the engine's opponent: which thinking system plays, plus its
// difficulty when it has one. Remote strategies have no difficulty dial — their local
// fallback plays at normal.
export type BotConfig =
  | { name: 'depthsearch'; difficulty: BotDifficulty }
  | { name: Exclude<AiStrategyId, 'depthsearch'> }

export const DEFAULT_BOT_CONFIG: BotConfig = { name: 'depthsearch', difficulty: 'normal' }

export function botOptions(config: BotConfig): BotOptions {
  return config.name === 'depthsearch' ? BOT_LEVELS[config.difficulty] : BOT_LEVELS.normal
}
