import { hexDist, key } from '../hex.ts'
import { aimAt, canUseSpecial, label, strikeArea } from '../combat.ts'
import type { Tile } from '../types.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

function bombTiles(pawn: Pawn, tiles: Map<string, Tile>): Tile[] {
  return canUseSpecial(pawn)
    ? [...tiles.values()].filter((tile) => hexDist(pawn, tile) <= 2)
    : []
}

const bomb: SpecialAbility = {
  name: 'Bomb',
  cost: 2,
  targeted: true,
  targetLabel: 'Bomb',
  prompt: 'Choose tile',
  description:
    'Choose any tile within 2 tiles, even empty or blocked ground. Deal 1 damage to every unit on it and its six neighboring tiles, including allies and yourself. Each may Escape.',
  targets: (pawn, pawns, from = pawn) =>
    pawns.filter((target) => target.side !== pawn.side && hexDist(from, target) <= 3),
  areaTargets: (pawns, tile) => pawns.filter((target) => hexDist(tile, target) <= 1),
  tileTargets: (pawn, tiles) =>
    new Set(bombTiles(pawn, tiles).map((tile) => key(tile.q, tile.r))),
  candidates: (pawn, { tiles, pawns }) =>
    bombTiles(pawn, tiles)
      .filter((tile) =>
        bomb.areaTargets!(pawns, tile, pawn).some((target) => target.side !== pawn.side),
      )
      .map(aimAt),
  threat: (pawn, { target, from, movementCost }) =>
    hexDist(from, target) <= 3
      ? Math.max(0, Math.floor((pawn.energy - movementCost) / pawn.special.cost))
      : 0,
  perform: ({ pawn, tiles, pawns, log, random, tile }) => {
    if (
      !tile ||
      !bombTiles(pawn, tiles).some((center) => center.q === tile.q && center.r === tile.r)
    )
      return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const targets = bomb.areaTargets!(pawns, tile, pawn)
    return {
      kind: 'bomb',
      to: tile,
      impacts: strikeArea(pawns, pawn, targets, log, random),
    }
  },
}

export class Bomber extends Pawn {
  static override readonly icon =
    'M10 20a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM13.3 8.1l1.6-1.6 2.3 2.3-1.6 1.6M16 7.4c.2-2.4 1.6-3.6 3.6-3.4M19.6 4l1-2.2M19.6 4l2.2-1M19.6 4 22 4.6M19.6 4l.4 2.2M6.8 12.8a3.3 3.3 0 0 1 2.7-2.6'
  readonly kind = 'bomber' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  get special(): SpecialAbility {
    return bomb
  }
}
