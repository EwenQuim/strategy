import {
  attackTargets,
  aimAt,
  canUseSpecial,
  enterTiles,
  pawnAt,
  specialTargets,
  strike,
} from '../combat.ts'
import { hexDist, key, neighbors, passable, sameHex, type Axial } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

function landings(
  pawn: Pawn,
  tiles: Parameters<SpecialAbility['perform']>[0]['tiles'],
  pawns: readonly Pawn[],
  from: Axial = pawn,
) {
  return neighbors(from.q, from.r)
    .filter(
      (at) =>
        passable(tiles.get(key(at.q, at.r))) &&
        !pawns.some((p) => p.id !== pawn.id && sameHex(p, at)),
    )
    .sort(
      (a, b) =>
        Number(tiles.get(key(a.q, a.r))!.terrain === 'lava') -
        Number(tiles.get(key(b.q, b.r))!.terrain === 'lava'),
    )
}

const harpoon: SpecialAbility = {
  name: 'harpoon',
  cost: 2,
  targeted: true,
  prompt: 'chooseEnemy',
  noTargets: 'noEnemiesInRange',
  description: 'harpoonDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) >= 1 && hexDist(pawn, tile) <= 2,
  targets: attackTargets,
  candidates: (pawn, { tiles, pawns }) =>
    specialTargets(pawns, pawn)
      .filter(
        (target) => hexDist(pawn, target) === 1 || landings(pawn, tiles, pawns).length > 0,
      )
      .map(aimAt),
  threat: (pawn, { target, from, tiles, pawns }) =>
    hexDist(from, target) >= 1 &&
    hexDist(from, target) <= 2 &&
    (hexDist(from, target) === 1 ||
      !!(tiles && pawns && landings(pawn, tiles, pawns, from).length))
      ? pawn.attack.damage
      : 0,
  perform: ({ pawn, tiles, pawns, tile, round }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !canUseSpecial(pawn) || !specialTargets(pawns, pawn).includes(target))
      return null
    const adjacent = hexDist(pawn, target) === 1
    const destination = landings(pawn, tiles, pawns)[0]
    if (!adjacent && !destination) return null
    pawn.energy -= pawn.special.cost
    const impacts = [strike(pawns, target, pawn.attack)]
    if (!adjacent && destination && pawns.includes(target) && sameHex(impacts[0], target))
      impacts.push(
        ...enterTiles(
          tiles,
          pawns,
          target,
          [tiles.get(key(destination.q, destination.r))!],
          round,
        ),
      )
    return { kind: 'attack', to: { q: target.q, r: target.r }, impacts }
  },
}

export class Harpooner extends Pawn {
  static override readonly accent = '#488e9e'
  static override readonly icon = 'M4 20 17 7M17 7V2m0 5h5M5 19l4 1m6-11 4 4'
  static override readonly aiInstructions =
    'Harpoon (2): deal 1 damage at range 1-2. Automatically pull a surviving distance-2 enemy to empty passable ground beside you, preferring non-lava. Protect intercepts the strike and prevents the pull. Landing terrain applies. Once per activation.'
  readonly kind = 'harpooner' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  get special(): SpecialAbility {
    return harpoon
  }
}
