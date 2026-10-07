import { hexDist, key, neighbors } from '../hex.ts'
import { aimAt, canUseSpecial, label, strikeArea } from '../combat.ts'
import type { Axial } from '../hex.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

function direction(from: Axial, to: Axial): string | null {
  const q = to.q - from.q
  const r = to.r - from.r
  return (q || r) && (q === 0 || r === 0 || q + r === 0)
    ? key(Math.sign(q), Math.sign(r))
    : null
}

const fireball: SpecialAbility = {
  name: 'fireball',
  cost: 2,
  targeted: true,
  targetLabel: 'fireballToward',
  prompt: 'chooseDirection',
  description: 'fireballDescription',
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

const LINED_UP_FOE = 1

// A fireball burns every enemy on one line, so a magician likes enemies lined up before it.
const magicianAi: PawnAi = {
  ...defaultAi,
  goal: (magician, surroundings) => {
    const lines = new Map<string, number>()
    for (const foe of surroundings.foes) {
      const line = direction(magician, foe)
      if (line) lines.set(line, (lines.get(line) ?? 0) + 1)
    }
    const linedUp = Math.max(0, ...lines.values()) - 1
    return defaultAi.goal(magician, surroundings) + Math.max(0, linedUp) * LINED_UP_FOE
  },
}

export class Magician extends Pawn {
  static override readonly accent = '#9b7bb5'
  static override readonly icon =
    'M4 20 14.5 9.5M13 8l3 3M18 2.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9ZM9.5 4.5v2m-1-1h2M20 13.5v2m-1-1h2'
  readonly kind = 'magician' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2, rangeBonus: 1 }
  get special(): SpecialAbility {
    return fireball
  }
  override get ai(): PawnAi {
    return magicianAi
  }
}
