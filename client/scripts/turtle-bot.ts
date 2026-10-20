import { activePawn, reducer, type Action, type GameState } from '../src/lib/engine/index.ts'
import { legalActions } from '../src/lib/engine/ai/options.ts'
import type { Bot } from '../src/bots/bot.ts'
import { turnOpening } from '../src/bots/bot.ts'
import { nearestEnemyDistance } from './gameplay-metrics.ts'

// The stall probe: a deliberately passive strategy that never attacks and only acts when the
// action increases its distance from every enemy, otherwise ending its activation. If this
// bot survives or wins, the rules reward turtling.
export class TurtleBot implements Bot<Record<string, never>> {
  readonly name = 'turtle'
  readonly options: Readonly<Record<string, never>> = {}

  async chooseActions(state: GameState): Promise<Action[]> {
    const opening = turnOpening(state)
    if (!opening.pawn) return opening.forced
    const id = opening.pawn.id
    const actions: Action[] = []
    let current = state
    while (!current.winner && activePawn(current)?.id === id) {
      const options = legalActions(current)
      if (!options.length) break
      const actor = activePawn(current)!
      const before = nearestEnemyDistance(current, actor)
      let best: { action: Action; gain: number } | null = null
      for (const action of options) {
        if (action.type === 'endTurn') continue
        const next = reducer(current, action)
        if (
          next.blows.length > current.blows.length ||
          current.pawns.some(
            (pawn) =>
              pawn.side !== actor.side &&
              (next.pawns.find((p) => p.id === pawn.id)?.hp ?? 0) < pawn.hp,
          )
        )
          continue
        const moved = next.pawns.find((pawn) => pawn.id === id)
        if (!moved || moved.hp <= 0) continue
        const gain = nearestEnemyDistance(next, moved) - before
        if (!best || gain > best.gain) best = { action, gain }
      }
      if (!best || best.gain <= 0) {
        actions.push({ type: 'endTurn' })
        break
      }
      actions.push(best.action)
      current = reducer(current, best.action)
    }
    return actions
  }
}
