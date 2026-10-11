import { canAttack, specialTargets } from './combat.ts'
import { key, type Axial, type Tile } from './hex.ts'
import { activePawn, type GameState } from './engine.ts'
import type { Pawn } from './pawns/index.ts'

// A command still being aimed: an attack, or a special whose destination may already be chosen.
export type Aim = { action: 'attack' } | { action: 'special'; destination?: Axial }

export function specialTargetingTiles(
  pawn: Pawn,
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  state: GameState,
): Set<string> {
  return (
    pawn.special.tileTargets?.(pawn, tiles, pawns, state) ??
    new Set(specialTargets(pawns, pawn).map((target) => key(target.q, target.r)))
  )
}

export function targetingTiles(state: GameState, aim: Aim): Set<string> {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return new Set()
  if (aim.action === 'attack')
    return new Set(
      state.pawns
        .filter((target) => canAttack(pawn, target, state.tiles.get(key(pawn.q, pawn.r))))
        .map((target) => key(target.q, target.r)),
    )
  if (aim.destination)
    return new Set(
      specialTargets(state.pawns, pawn, aim.destination).map((target) =>
        key(target.q, target.r),
      ),
    )
  return specialTargetingTiles(pawn, state.tiles, state.pawns, state)
}
