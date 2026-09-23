import { aimAt, canUseSpecial, enterTiles } from '../combat.ts'
import { hexDist, key, passable } from '../hex.ts'
import type { Tile } from '../types.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

export function jumpDestinations(tiles: Map<string, Tile>, pawns: Pawn[], pawn: Pawn): Tile[] {
  if (pawn.special !== jump || !canUseSpecial(pawn)) return []
  const occupied = new Set(pawns.map((p) => key(p.q, p.r)))
  return [...tiles.values()].filter(
    (tile) => passable(tile) && !occupied.has(key(tile.q, tile.r)) && hexDist(pawn, tile) <= 3,
  )
}

const jump: SpecialAbility = {
  name: 'Jump',
  cost: 2,
  targeted: true,
  targetLabel: 'Jump to',
  prompt: 'Choose tile',
  description:
    'Jump up to 3 tiles, passing over terrain and units. Land on empty ground, never a mountain or lake. Jump does not attack.',
  targets: () => [],
  candidates: (pawn, { tiles, pawns }) => jumpDestinations(tiles, pawns, pawn).map(aimAt),
  tileTargets: (pawn, tiles, pawns) =>
    new Set(jumpDestinations(tiles, pawns, pawn).map((tile) => key(tile.q, tile.r))),
  perform: ({ pawn, tiles, pawns, tile, round, log }) => {
    if (
      !tile ||
      !jumpDestinations(tiles, pawns, pawn).some(
        (land) => land.q === tile.q && land.r === tile.r,
      )
    )
      return null
    pawn.q = tile.q
    pawn.r = tile.r
    pawn.energy -= pawn.special.cost
    const impacts = enterTiles(
      tiles,
      pawns,
      pawn,
      [tiles.get(key(tile.q, tile.r))!],
      round,
      log,
    )
    return { kind: 'move', to: tile, ...(impacts.length ? { impacts } : {}) }
  },
}

export class Ninja extends Pawn {
  static override readonly icon =
    'M4 9a8 8 0 0 1 16 0v6a8 8 0 0 1-16 0V9Zm0 0h16M4 15h16M7 12h2m6 0h2M4 9 1 5m3 4L1 12'
  readonly kind = 'ninja' as const
  get maxHp(): number {
    return 1
  }
  readonly attack: AttackProfile = { damage: 5, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return jump
  }
}
