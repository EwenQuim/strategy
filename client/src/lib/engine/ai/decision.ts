import type { Action, GameState } from '../engine.ts'
import type { BotOptions } from '../ai.ts'
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
}

// Adding a strategy is a new file in strategies/ plus one import and one entry here; the key
// union keeps every call site of chooseAiActions checked against the registered names.
export const STRATEGIES = { depthsearch, random, mistral, jev } as const satisfies Record<
  string,
  AiStrategy
>

export type AiStrategyId = keyof typeof STRATEGIES

export function chooseAiActions(
  state: GameState,
  options: BotOptions,
  strategy: AiStrategyId = 'depthsearch',
): Action[] {
  return STRATEGIES[strategy].chooseActions(state, options)
}
