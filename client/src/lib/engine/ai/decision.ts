import type { Action, GameState } from '../engine.ts'
import type { BotDifficulty, BotOptions } from '../ai.ts'
import { depthsearch } from './strategies/depthsearch.ts'
import { random } from './strategies/random.ts'

// A thinking system: it proposes the actions for one decision of the side it plays, under the
// shared difficulty options. A strategy may reuse the toolbox beside this file — turn
// enumeration (turns.ts), legal single actions (options.ts), position evaluation (evaluate.ts),
// tie-breaking (choice.ts), stance planning (plan.ts) — or ignore all of it and think its own way.
export type AiStrategy = (state: GameState, options: BotOptions) => Promise<Action[]>

// Only local implementations belong in the engine. The application assembles the complete
// registry, including remote adapters, in src/api/bots.ts.
export const LOCAL_STRATEGIES = {
  depthsearch,
  random,
} as const satisfies Record<string, AiStrategy>

export type LocalBotConfig =
  | { name: 'depthsearch'; difficulty: BotDifficulty }
  | { name: Exclude<keyof typeof LOCAL_STRATEGIES, 'depthsearch'> }

export const DEFAULT_BOT_CONFIG = {
  name: 'depthsearch',
  difficulty: 'normal',
} satisfies LocalBotConfig
