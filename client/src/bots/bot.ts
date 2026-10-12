import type { Action, GameState } from '../lib/engine/engine.ts'

// Anything that can think for the side to act: it proposes actions for the active unit and the
// engine judges them. The engine only offers the toolbox (legal actions, turn enumeration,
// scoring in engine/ai/); every bot, local or remote, is a separate implementation of this type.
export interface Bot<Options extends object = object> {
  readonly name: string
  readonly options: Readonly<Options>
  chooseActions(state: GameState): Promise<Action[]>
}

// Plays the primary bot's proposal, or the fallback's when the primary fails or has nothing.
export function withFallback<B extends Bot>(
  primary: B,
  fallback: Bot,
): Bot & Pick<B, 'name' | 'options'> {
  return {
    name: primary.name,
    options: primary.options,
    async chooseActions(state) {
      const actions = await primary.chooseActions(state).catch(() => [])
      return actions.length ? actions : fallback.chooseActions(state)
    },
  }
}
