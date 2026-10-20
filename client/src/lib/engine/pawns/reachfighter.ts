import { aimAt, attackTargets, pawnAt, specialTargets, strike } from '../combat.ts'
import { hexDist } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const jab: SpecialAbility = {
  name: 'jab',
  cost: 2,
  targeted: true,
  prompt: 'chooseEnemy',
  noTargets: 'noEnemiesInRange',
  description: 'jabDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) >= 1 && hexDist(pawn, tile) <= 2,
  targets: attackTargets,
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts: [strike(pawns, target, pawn.attack)],
    }
  },
}

export class Reachfighter extends Pawn {
  static override readonly accent = '#488e9e'
  static override readonly icon = 'M4 20 17 7M17 7V2m0 5h5'
  static override readonly aiInstructions =
    'Jab (2): deal 1 damage at range 1-2. No displacement. Once per activation. Experimental matched-stat control for Harpooner.'
  readonly kind = 'reachfighter' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  get special(): SpecialAbility {
    return jab
  }
}
