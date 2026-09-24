import { hexDist, key, neighbors } from '../hex.ts'
import { aimAt, canUseSpecial, label, strikeArea } from '../combat.ts'
import type { Axial } from '../types.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

function direction(from: Axial, to: Axial): string | null {
  const q = to.q - from.q
  const r = to.r - from.r
  return (q || r) && (q === 0 || r === 0 || q + r === 0)
    ? key(Math.sign(q), Math.sign(r))
    : null
}

const fireball: SpecialAbility = {
  name: 'Fireball',
  cost: 2,
  targeted: true,
  targetLabel: 'Fireball toward',
  prompt: 'Choose direction',
  description:
    'Choose one of six directions by selecting a tile in that line. Deal 1 damage to every enemy along it to the edge of the board, through terrain and units. Each may Escape; allies are unharmed.',
  targets: (pawn, pawns, from = pawn) =>
    pawns.filter((target) => target.side !== pawn.side && direction(from, target)),
  areaTargets: (pawns, tile, pawn) =>
    pawns.filter(
      (target) =>
        target.side !== pawn.side &&
        direction(pawn, target) !== null &&
        direction(pawn, target) === direction(pawn, tile),
    ),
  tileTargets: (pawn, tiles) =>
    new Set(
      canUseSpecial(pawn)
        ? [...tiles.values()]
            .filter((tile) => direction(pawn, tile))
            .map((tile) => key(tile.q, tile.r))
        : [],
    ),
  candidates: (pawn, { tiles, pawns }) =>
    canUseSpecial(pawn)
      ? neighbors(pawn.q, pawn.r)
          .filter(
            (tile) =>
              tiles.has(key(tile.q, tile.r)) &&
              fireball.areaTargets!(pawns, tile, pawn).length > 0,
          )
          .map(aimAt)
      : [],
  threat: (pawn, { target, from, movementCost }) =>
    direction(from, target)
      ? Math.max(0, Math.floor((pawn.energy - movementCost) / pawn.special.cost))
      : 0,
  perform: ({ pawn, tiles, pawns, log, random, tile }) => {
    if (!tile || !canUseSpecial(pawn) || !tiles.has(key(tile.q, tile.r))) return null
    const ray = direction(pawn, tile)
    if (!ray) return null
    const line = [...tiles.values()].filter((position) => direction(pawn, position) === ray)
    const end = line.reduce((furthest, position) =>
      hexDist(pawn, position) > hexDist(pawn, furthest) ? position : furthest,
    )
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const targets = fireball.areaTargets!(pawns, tile, pawn)
    return {
      kind: 'fireball',
      to: { q: end.q, r: end.r },
      impacts: strikeArea(pawns, pawn, targets, log, random),
    }
  },
}

export class Magician extends Pawn {
  static override readonly icon =
    'M4 20 14.5 9.5M13 8l3 3M18 2.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9ZM9.5 4.5v2m-1-1h2M20 13.5v2m-1-1h2'
  readonly kind = 'magician' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2, rangeBonus: 1 }
  get special(): SpecialAbility {
    return fireball
  }
}
