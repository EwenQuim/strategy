import { movementDestinations } from './combat.ts'
import { inHellfire } from './hellfire.ts'
import { key, neighbors, type Axial } from './hex.ts'
import type { Action, GameState } from './engine.ts'
import type { Pawn } from './pawns/index.ts'

type UnitThreat = {
  incoming: number
  health: number
  hellfireDamage: number
  value: number
  caution: number
}

type UnitSurroundings = {
  allies: readonly Pawn[]
  attackDistance: number | undefined
  aggression: number
}

export interface PawnAi {
  moves(pawn: Pawn, state: GameState): Action[][]
  value(pawn: Pawn, health: number): number
  risk(pawn: Pawn, threat: UnitThreat): number
  goal(pawn: Pawn, surroundings: UnitSurroundings): number
  ruleSpecial?(pawn: Pawn, state: GameState, foes: Pawn[], specials: Pawn[]): Action[] | null
}

const UNIT_SCORE = { unit: 12, attackDamage: 3, health: 4, attackDistance: 8 }
const UNREACHABLE_DISTANCE = 100

const moveTo = ({ q, r }: Axial): Action[] => [{ type: 'move', q, r }]

export function reachableMoves(pawn: Pawn, state: GameState): Action[][] {
  const moves = movementDestinations(state.tiles, state.pawns, pawn)
  return [...moves.keys()]
    .map((position) => state.tiles.get(position)!)
    .filter((tile) => tile && moves.get(key(tile.q, tile.r)))
    .map(moveTo)
}

function stepMoves(pawn: Pawn, state: GameState): Action[][] {
  if (inHellfire(state.hellfire, pawn)) return reachableMoves(pawn, state)
  const moves = movementDestinations(state.tiles, state.pawns, pawn)
  return neighbors(pawn.q, pawn.r)
    .filter((tile) => moves.get(key(tile.q, tile.r)))
    .map(moveTo)
}

export const defaultAi: PawnAi = {
  moves: stepMoves,
  value: (pawn, health) =>
    UNIT_SCORE.unit + pawn.attack.damage * UNIT_SCORE.attackDamage + health * UNIT_SCORE.health,
  risk: (pawn, { incoming, health, value, caution }) => {
    const expected = incoming * (1 - pawn.escapeChance / 100)
    return (
      caution *
      (Math.min(health, expected) * UNIT_SCORE.health + (expected >= health ? value : 0))
    )
  },
  goal: (_pawn, { attackDistance, aggression }) =>
    -(attackDistance ?? UNREACHABLE_DISTANCE) * UNIT_SCORE.attackDistance * aggression,
}
