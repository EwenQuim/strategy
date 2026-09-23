import { hexDist } from '../hex.ts'
import {
  aimAt,
  attackTargets,
  canAttack,
  label,
  pawnAt,
  specialTargets,
  strike,
} from '../combat.ts'
import type { BattleImpact } from '../types.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const fireball: SpecialAbility = {
  name: 'Fireball',
  cost: 2,
  targeted: true,
  description:
    'Target an enemy within 2 tiles. Deal 1 damage to it and every adjacent enemy. Each may Escape; allies are unharmed.',
  targets: attackTargets,
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  threat: (pawn, { target, targets, from, movementCost }) => {
    const remainingEnergy = pawn.energy - movementCost
    return remainingEnergy >= pawn.special.cost &&
      targets.some(
        (neighbor) =>
          hexDist(neighbor, target) <= 1 && canAttack(pawn, neighbor, { q: from.q, r: from.r }),
      )
      ? Math.floor(remainingEnergy / pawn.special.cost)
      : 0
  },
  perform: ({ pawn, pawns, log, random, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const impacts: BattleImpact[] = []
    for (const enemy of pawns.filter((p) => p.side !== pawn.side && hexDist(target, p) <= 1)) {
      if (!pawns.includes(enemy)) continue
      const hit = strike(pawns, pawn, enemy, pawn.attack, log, random)
      const previous = impacts.find((impact) => impact.q === hit.q && impact.r === hit.r)
      if (previous) previous.damage += hit.damage
      else impacts.push(hit)
    }
    return { kind: 'fireball', to: { q: target.q, r: target.r }, impacts }
  },
}

export class Magician extends Pawn {
  static override readonly icon =
    'm4 20 12-12m-9 9 3 3M17 2l1.5 4.5L23 8l-4.5 1.5L17 14l-1.5-4.5L11 8l4.5-1.5L17 2Z'
  readonly kind = 'magician' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2, rangeBonus: 1 }
  get special(): SpecialAbility {
    return fireball
  }
}
