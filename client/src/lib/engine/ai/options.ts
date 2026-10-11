import { activePawn, reducer, type Action, type GameState } from '../engine.ts'
import { targetingTiles, type Aim } from '../targeting.ts'
import { movementDestinations } from '../combat.ts'
import type { Axial } from '../hex.ts'

// Every command the reducer accepts in this state.
export function legalActions(state: GameState): Action[] {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  const tileAt = (position: string): Axial => {
    const { q, r } = state.tiles.get(position)!
    return { q, r }
  }
  const aimed = (aim: Aim) => [...targetingTiles(state, aim)].map(tileAt)
  const specials: Action[] = !pawn.special.targeted
    ? [{ type: 'special' }]
    : aimed({ action: 'special' }).flatMap((tile): Action[] =>
        pawn.special.choosesDestination
          ? aimed({ action: 'special', destination: tile }).map((target) => ({
              type: 'special',
              target,
              destination: tile,
            }))
          : [{ type: 'special', target: tile }],
      )
  const candidates: Action[] = [
    ...[...movementDestinations(state.tiles, state.pawns, pawn).keys()]
      .map(tileAt)
      .map((tile): Action => ({ type: 'move', ...tile })),
    ...aimed({ action: 'attack' }).map((tile): Action => ({ type: 'attack', ...tile })),
    ...specials,
    { type: 'endTurn' },
  ]
  return candidates.filter((action) => reducer(state, action) !== state)
}
