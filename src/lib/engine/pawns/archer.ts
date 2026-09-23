import { aimAt, attackTargets, label, pawnAt, specialTargets, strike } from '../combat.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const aimedShot: SpecialAbility = {
  name: 'Aimed shot',
  cost: 2,
  targeted: true,
  description:
    'Deal 2 damage to an enemy 2 to 3 tiles away, ignoring Escape. Cannot shoot adjacent enemies.',
  targets: attackTargets,
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, log, random, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts: [
        strike(
          pawns,
          pawn,
          target,
          { ...pawn.attack, damage: 2, ignoresEscape: true },
          log,
          random,
        ),
      ],
    }
  },
}

export class Archer extends Pawn {
  static override readonly icon = 'M5 3c14 0 14 18 0 18V3Zm0 9h16m-4-4 4 4-4 4'
  readonly kind = 'archer' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 2, maxRange: 3, rangeBonus: 1 }
  get special(): SpecialAbility {
    return aimedShot
  }
}
