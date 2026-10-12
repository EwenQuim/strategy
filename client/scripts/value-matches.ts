import { activePawn, reducer, type GameState } from '../src/lib/engine/index.ts'
import type { Bot } from '../src/bots/bot.ts'
import { valueFeatures } from '../src/bots/valueFeatures.ts'

export async function playValueMatch(
  opening: GameState,
  player: Bot,
  enemy: Bot,
  maxActivations: number,
  record = false,
) {
  let state = opening
  const positions: number[][] = []
  const cache = { reach: new Map() }
  const times: Record<'player' | 'enemy', number[]> = { player: [], enemy: [] }
  let activations = 0
  const started = performance.now()
  while (activations < maxActivations && !state.winner) {
    const actor = activePawn(state)!
    if (record) positions.push(valueFeatures(state, 'player', cache))
    const before = performance.now()
    const actions = await (actor.side === 'player' ? player : enemy).chooseActions(state)
    times[actor.side].push(performance.now() - before)
    if (!actions.length) throw new Error('Bot failed to finish an activation')
    for (const action of actions) {
      const next = reducer(state, action)
      if (next === state) throw new Error('Bot proposed an illegal action')
      state = next
    }
    if (!state.winner && activePawn(state)?.id === actor.id)
      throw new Error('Bot failed to finish an activation')
    activations++
  }
  return {
    winner: state.winner,
    round: state.round,
    activations,
    elapsedMs: performance.now() - started,
    positions,
    times,
  }
}

export function percentile(values: readonly number[], fraction: number): number {
  return values.toSorted((a, b) => a - b)[Math.ceil(values.length * fraction) - 1] ?? 0
}
