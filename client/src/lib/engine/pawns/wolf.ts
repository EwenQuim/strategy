import { aimAt, allyTargets, attackTargets, pawnAt, specialTargets, strike } from '../combat.ts'
import { hexDist } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const cry: SpecialAbility = {
  name: 'cry',
  cost: 2,
  targeted: true,
  noTargets: 'noEnemiesWithinReach',
  prompt: 'chooseEnemy',
  description: 'cryDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) === 1,
  targets: attackTargets,
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    const impacts = [strike(pawns, target, pawn.attack)]
    const allies = allyTargets(pawn, pawns)
    for (const ally of allies) {
      ally.energy += 1
      ally.bonusEnergy += 1
    }
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts,
      support: { kind: 'energy', recipients: allies.map(({ q, r }) => ({ q, r })) },
    }
  },
}

export class Wolf extends Pawn {
  static override readonly startsOnFrontRow = true
  static override readonly accent = '#8a9a8a'
  static override readonly icon = 'M5 4l4 3h6l4-3v5l-3 5-4 7-4-7-3-5V4Zm4 7h.01m6 0h.01'
  readonly kind = 'wolf' as const
  static override readonly aiInstructions =
    'Pack Hunt (2): bite an adjacent enemy for 2 and give +1 energy this round to every adjacent ally, even those that have acted. Does not restore used abilities or grant another activation. Once per activation.'
  get maxHp(): number {
    return 3
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return cry
  }
}
