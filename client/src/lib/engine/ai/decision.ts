import type { Action, GameState } from '../engine.ts'
import { BOT_LEVELS, type BotDifficulty, type BotOptions } from '../ai.ts'
import type { Thinking } from './thinking.ts'
import { depthsearch } from './strategies/depthsearch.ts'
import { jev } from './strategies/jev.ts'
import { mistral } from './strategies/mistral.ts'
import { random } from './strategies/random.ts'

// A thinking system: it proposes the actions for one decision of the side it plays, under the
// shared difficulty options. A strategy may reuse the toolbox beside this file — turn
// enumeration (turns.ts), legal single actions (options.ts), position evaluation (evaluate.ts),
// tie-breaking (choice.ts), stance planning (plan.ts) — or ignore all of it and think its own way.
export interface AiStrategy {
  // Stable identifier, for logs and analysis output.
  readonly id: string
  // True when the real thinking happens in an async adapter outside the engine (src/api):
  // the strategy's chooseActions is then only the synchronous fallback.
  readonly adapterDriven?: boolean
  chooseActions(state: GameState, options: BotOptions): Action[]
  // The same decision, pausing between search steps.
  think?(state: GameState, options: BotOptions): Thinking<Action[]>
}

// Adding a strategy is a new file in strategies/ plus one import and one entry here; the key
// union keeps every call site of chooseAiActions checked against the registered names.
export const STRATEGIES = { depthsearch, random, mistral, jev } as const satisfies Record<
  string,
  AiStrategy
>

export type AiStrategyId = keyof typeof STRATEGIES

// The whole description of the engine's opponent: which thinking system plays, plus its
// difficulty when it has one. Remote strategies have no difficulty dial — their synchronous
// fallback plays at normal.
export type BotConfig =
  | { name: 'depthsearch'; difficulty: BotDifficulty }
  | { name: Exclude<AiStrategyId, 'depthsearch'> }

export const DEFAULT_BOT_CONFIG: BotConfig = { name: 'depthsearch', difficulty: 'normal' }

export function botOptions(config: BotConfig): BotOptions {
  return config.name === 'depthsearch' ? BOT_LEVELS[config.difficulty] : BOT_LEVELS.normal
}

export function chooseAiActions(
  state: GameState,
  options: BotOptions,
  strategy: AiStrategyId = 'depthsearch',
): Action[] {
  return STRATEGIES[strategy].chooseActions(state, options)
}

export function* thinkAiActions(
  state: GameState,
  options: BotOptions,
  strategy: AiStrategyId,
): Thinking<Action[]> {
  const chosen: AiStrategy = STRATEGIES[strategy]
  return chosen.think
    ? yield* chosen.think(state, options)
    : chosen.chooseActions(state, options)
}
