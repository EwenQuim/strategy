import { aimAt, allyTargets, label, pawnAt, specialTargets } from '../combat.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const HEAL = 3

const heal: SpecialAbility = {
  name: 'Heal',
  cost: 2,
  targeted: true,
  targetLabel: 'Heal',
  prompt: 'Choose an ally',
  noTargets: 'No wounded ally nearby',
  description:
    'Restore 3 health to an adjacent wounded ally, up to their maximum. Cannot target yourself or a full-health ally.',
  targets: (pawn, pawns) => allyTargets(pawn, pawns, true),
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, log, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    const before = target.hp
    target.hp = Math.min(target.maxHp, target.hp + HEAL)
    log.push(
      label(pawn) +
        ' heals ' +
        target.kind +
        ' #' +
        target.id +
        ' (+' +
        (target.hp - before) +
        ').',
    )
    return { kind: 'rally', to: { q: target.q, r: target.r } }
  },
}

export class Cleric extends Pawn {
  static override readonly icon = 'M12 3v18M5 9h14M7 21h10'
  readonly kind = 'cleric' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return heal
  }
}
