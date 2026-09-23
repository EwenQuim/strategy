import { aimAt, canUseSpecial, label, pawnAt, strike } from '../combat.ts'
import { hexDist, key, neighbors, passable } from '../hex.ts'
import type { Axial, Tile } from '../types.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const REACH = 3
const DIRS = neighbors(0, 0)

function pullLanding(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  target: Pawn,
): Axial | null {
  const distance = hexDist(pawn, target)
  if (target.side === pawn.side || distance < 2 || distance > REACH) return null
  const occupied = new Set(pawns.map((p) => key(p.q, p.r)))
  let landing: Axial | null = null
  let closest = Infinity
  for (const step of DIRS) {
    const spot = { q: pawn.q + step.q, r: pawn.r + step.r }
    const k = key(spot.q, spot.r)
    if (occupied.has(k) || !passable(tiles.get(k))) continue
    const toTarget = hexDist(spot, target)
    if (toTarget < closest) {
      landing = spot
      closest = toTarget
    }
  }
  return landing
}

const harpoon: SpecialAbility = {
  name: 'Harpoon',
  cost: 2,
  targeted: true,
  targetLabel: 'Harpoon',
  prompt: 'Choose a target',
  noTargets: 'No enemy in reach to pull',
  description: 'Yank an enemy 2 to 3 tiles away to an open tile beside you, dealing 1 damage.',
  targets: (pawn, pawns) =>
    pawns.filter(
      (p) => p.side !== pawn.side && hexDist(pawn, p) >= 2 && hexDist(pawn, p) <= REACH,
    ),
  tileTargets: (pawn, tiles, pawns) =>
    new Set(pawns.filter((p) => pullLanding(tiles, pawns, pawn, p)).map((p) => key(p.q, p.r))),
  candidates: (pawn, { tiles, pawns }) =>
    !canUseSpecial(pawn)
      ? []
      : pawns.filter((p) => pullLanding(tiles, pawns, pawn, p)).map((p) => aimAt(p)),
  perform: ({ pawn, tiles, pawns, log, random, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target) return null
    const landing = pullLanding(tiles, pawns, pawn, target)
    if (!landing) return null
    pawn.energy -= pawn.special.cost
    target.q = landing.q
    target.r = landing.r
    log.push(label(pawn) + ' harpoons ' + target.kind + ' #' + target.id + '.')
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts: [strike(pawns, pawn, target, pawn.attack, log, random)],
    }
  },
}

export class Harpooner extends Pawn {
  static override readonly icon = 'M12 3v9a4 4 0 1 1-4-4m4-5 3 3-3 3'
  readonly kind = 'harpooner' as const
  get maxHp(): number {
    return 4
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  get special(): SpecialAbility {
    return harpoon
  }
}
