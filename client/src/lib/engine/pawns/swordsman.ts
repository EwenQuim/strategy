import {
  attackTargets,
  aimAt,
  canAttack,
  canUseSpecial,
  enterTiles,
  label,
  pawnAt,
  specialTargets,
  strike,
  walkingPaths,
} from '../combat.ts'
import { key, type Tile } from '../hex.ts'
import type { Action } from '../engine.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

export function chargeDestinations(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
): Map<string, number> {
  if (pawn.special !== charge || !canUseSpecial(pawn)) return new Map()
  return new Map(
    [...walkingPaths(tiles, pawns, pawn, 2)]
      .filter(([k]) => specialTargets(pawns, pawn, tiles.get(k)!).length > 0)
      .map(([k, route]) => [k, route.path.length]),
  )
}

const charge: SpecialAbility = {
  name: 'Charge',
  cost: 2,
  targeted: true,
  choosesDestination: true,
  targetLabel: 'Charge to',
  prompt: 'Choose tile',
  description:
    'Choose a tile up to 2 steps away, then an adjacent enemy. Move and strike for 2 damage. Mountains, lakes, and occupied tiles block the path.',
  targets: attackTargets,
  tileTargets: (pawn, tiles, pawns) => new Set(chargeDestinations(tiles, pawns, pawn).keys()),
  candidates: (pawn, { tiles, pawns }) =>
    [...chargeDestinations(tiles, pawns, pawn).keys()].flatMap((position) => {
      const tile = tiles.get(position)!
      return pawns
        .filter((target) => canAttack(pawn, target, tile))
        .map((target): Action[] => [
          ...aimAt(tile),
          { type: 'specialAt', q: target.q, r: target.r },
        ])
    }),
  threat: (pawn, { target, from, movementCost }) => {
    if (!canAttack(pawn, target, from)) return 0
    const chargeCost = Math.max(0, movementCost - 2) + pawn.special.cost
    return pawn.energy >= chargeCost ? (1 + pawn.energy - chargeCost) * pawn.attack.damage : 0
  },
  perform: ({ pawn, tiles, pawns, tile, destination, round, log, random }) => {
    const target = tile && pawnAt(pawns, tile)
    if (
      !target ||
      !destination ||
      !chargeDestinations(tiles, pawns, pawn).has(key(destination.q, destination.r)) ||
      !specialTargets(pawns, pawn, destination).includes(target)
    )
      return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const route = walkingPaths(tiles, pawns, pawn, 2).get(key(destination.q, destination.r))!
    const impacts = enterTiles(tiles, pawns, pawn, route.path, round, log)
    if (pawn.hp > 0) impacts.push(strike(pawns, pawn, target, pawn.attack, log, random))
    return { kind: 'attack', to: { q: target.q, r: target.r }, impacts }
  },
}

export class Swordsman extends Pawn {
  static override readonly icon =
    'M20 3.5 9.5 14M20 3.5h-3.2L7.5 12.8M20 3.5v3.2l-9.3 9.3M5.5 11.5l7 7M8 16.5 3.5 21'
  readonly kind = 'swordsman' as const
  get maxHp(): number {
    return 5
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return charge
  }
}
