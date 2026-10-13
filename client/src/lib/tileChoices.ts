import {
  activePawn,
  key,
  pawnAt,
  targetingTiles,
  type Action,
  type Aim,
  type GameState,
} from './engine/index.ts'

export type TileChoice =
  { kind: 'landing'; nextAim: Aim } | { kind: 'move' | 'attack'; action: Action }

export type Targeting = 'strike' | 'charge' | 'jump' | 'special'

export function tileChoices(state: GameState, aim: Aim): Map<string, TileChoice> {
  const pawn = activePawn(state)
  const choices = new Map<string, TileChoice>()
  if (!pawn || state.winner) return choices
  const targets = targetingTiles(state, aim)
  const choosingLanding = pawn.special.choosesDestination && !aim.destination
  for (const position of targets) {
    const tile = state.tiles.get(position)!
    const at = { q: tile.q, r: tile.r }
    if (choosingLanding) {
      const nextAim: Aim = { action: 'special', destination: at }
      choices.set(
        position,
        pawn.special.targetOptional && !targetingTiles(state, nextAim).size
          ? { kind: 'move', action: { type: 'special', destination: at } }
          : { kind: 'landing', nextAim },
      )
    } else {
      const occupant = pawnAt(state.pawns, at)
      choices.set(position, {
        kind: aim.destination || (occupant && occupant.side !== pawn.side) ? 'attack' : 'move',
        action: {
          type: 'special',
          target: at,
          ...(aim.destination ? { destination: aim.destination } : {}),
        },
      })
    }
  }
  if (choosingLanding && targets.has(key(pawn.q, pawn.r))) {
    const destination = { q: pawn.q, r: pawn.r }
    for (const position of targetingTiles(state, { action: 'special', destination })) {
      const tile = state.tiles.get(position)!
      choices.set(position, {
        kind: 'attack',
        action: { type: 'special', target: { q: tile.q, r: tile.r }, destination },
      })
    }
  }
  return choices
}
