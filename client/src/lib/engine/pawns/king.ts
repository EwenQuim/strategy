import { allyTargets, label, specialTargets } from '../combat.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const rally: SpecialAbility = {
  name: 'rally',
  cost: 1,
  targeted: false,
  oncePerRound: true,
  noTargets: 'noAlliesToHeal',
  description: 'rallyDescription',
  targets: (pawn, pawns) => allyTargets(pawn, pawns, true),
  candidates: (pawn, { pawns }) =>
    specialTargets(pawns, pawn).length ? [[{ type: 'act', action: 'special' }]] : [],
  perform: ({ pawn, pawns, log }) => {
    const allies = specialTargets(pawns, pawn)
    if (!allies.length) return null
    pawn.energy -= pawn.special.cost
    pawn.specialUsed = true
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    for (const ally of allies) {
      ally.hp = Math.min(ally.maxHp, ally.hp + 1)
      log.push(label(ally) + ' recovers 1 health.')
    }
    return { kind: 'rally', to: { q: pawn.q, r: pawn.r } }
  },
}

export class King extends Pawn {
  static override readonly icon = 'm3 6 4 4 5-7 5 7 4-4-2 12H5L3 6ZM6 21h12'
  readonly kind = 'king' as const
  get maxHp(): number {
    return 7
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return rally
  }
}
