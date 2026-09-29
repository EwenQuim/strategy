import { activePawn, reducer, targetingTiles, type Action, type GameState } from '../engine.ts'
import { movementDestinations } from '../combat.ts'

// Every action the reducer accepts in this state, one step at a time.
export function legalActions(state: GameState): Action[] {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  const tileAt = (position: string) => state.tiles.get(position)!
  const candidates: Action[] =
    state.phase === 'move'
      ? [
          ...[...movementDestinations(state.tiles, state.pawns, pawn).keys()]
            .map(tileAt)
            .map(({ q, r }): Action => ({ type: 'move', q, r })),
          { type: 'act', action: 'attack' },
          { type: 'act', action: 'special' },
        ]
      : [
          ...[...targetingTiles(state)].map(tileAt).map(({ q, r }): Action => ({
            type: state.phase === 'attack' ? 'attackAt' : 'specialAt',
            q,
            r,
          })),
          { type: 'cancelTargeting' },
        ]
  candidates.push({ type: 'endTurn' })
  return candidates.filter((action) => reducer(state, action) !== state)
}
