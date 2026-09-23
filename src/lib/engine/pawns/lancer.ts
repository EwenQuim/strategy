import {
  aimAt,
  canUseSpecial,
  enterTiles,
  label,
  pawnAt,
  strike,
  walkingPaths,
} from '../combat.ts'
import { hexDist, key, passable } from '../hex.ts'
import type { Axial, Tile } from '../types.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const REACH = 3

type Plan = { landing: Axial; route: Tile[]; shove: Axial | null }

function lancePlan(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  target: Pawn,
): Plan | null {
  if (target.side === pawn.side) return null
  const reach = walkingPaths(tiles, pawns, pawn, REACH)
  let landing: Axial | null = null
  let steps = Infinity
  let route: Tile[] = []
  for (const [k, path] of reach) {
    const [q, r] = k.split(',').map(Number)
    if (hexDist({ q, r }, target) === 1 && path.path.length < steps) {
      landing = { q, r }
      steps = path.path.length
      route = path.path
    }
  }
  if (!landing) return null
  const dir = { q: target.q - landing.q, r: target.r - landing.r }
  const behind = { q: target.q + dir.q, r: target.r + dir.r }
  const blocked = pawns.some(
    (p) => p.id !== pawn.id && p.id !== target.id && p.q === behind.q && p.r === behind.r,
  )
  const canShove = passable(tiles.get(key(behind.q, behind.r))) && !blocked
  return { landing, route, shove: canShove ? behind : null }
}

const lance: SpecialAbility = {
  name: 'Lance',
  cost: 2,
  targeted: true,
  targetLabel: 'Lance',
  prompt: 'Choose a target',
  noTargets: 'No enemy in reach',
  description:
    'Charge an enemy up to 4 tiles away, striking for 2 and shoving it back a tile. If it cannot be pushed, it takes 1 extra crash damage. The approach must be walkable.',
  targets: (pawn, pawns) =>
    pawns.filter((p) => p.side !== pawn.side && hexDist(pawn, p) <= REACH + 1),
  tileTargets: (pawn, tiles, pawns) =>
    new Set(
      pawns
        .filter((p) => p.side !== pawn.side && lancePlan(tiles, pawns, pawn, p))
        .map((p) => key(p.q, p.r)),
    ),
  candidates: (pawn, { tiles, pawns }) =>
    !canUseSpecial(pawn)
      ? []
      : pawns
          .filter((p) => p.side !== pawn.side && lancePlan(tiles, pawns, pawn, p))
          .map((p) => aimAt(p)),
  perform: ({ pawn, tiles, pawns, log, random, round, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target) return null
    const plan = lancePlan(tiles, pawns, pawn, target)
    if (!plan) return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' lances ' + target.kind + ' #' + target.id + '.')
    const impacts = enterTiles(tiles, pawns, pawn, plan.route, round, log)
    if (pawn.hp <= 0) return { kind: 'attack', to: { q: pawn.q, r: pawn.r }, impacts }
    impacts.push(strike(pawns, pawn, target, pawn.attack, log, random))
    if (pawns.includes(target)) {
      if (plan.shove) {
        target.q = plan.shove.q
        target.r = plan.shove.r
      } else {
        impacts.push(
          strike(
            pawns,
            pawn,
            target,
            { ...pawn.attack, damage: 1, ignoresEscape: true },
            log,
            random,
          ),
        )
      }
    }
    return { kind: 'attack', to: { q: target.q, r: target.r }, impacts }
  },
}

export class Lancer extends Pawn {
  static override readonly icon = 'M4 20 20 4m-5 0h5v5M6 14l4 4'
  readonly kind = 'lancer' as const
  get maxHp(): number {
    return 4
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return lance
  }
}
