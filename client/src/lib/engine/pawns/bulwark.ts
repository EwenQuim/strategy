import { aimAt, label, pawnAt, protectorFor, specialTargets } from '../combat.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'
import { hexDist } from '../hex.ts'

const protect: SpecialAbility = {
  name: 'Protect',
  cost: 2,
  targeted: true,
  prompt: 'Choose ally',
  noTargets: 'No nearby allies',
  description:
    'Protect an ally within 2 tiles until your next turn. Take its next hit instead, without a second Escape roll. Ends if you move more than 2 tiles apart. Moving costs 2 energy for the first tile, then 1 per extra tile.',
  targets: (pawn, pawns) =>
    pawns.filter(
      (target) =>
        target.side === pawn.side && target.id !== pawn.id && hexDist(pawn, target) <= 2,
    ),
  candidates: (pawn, { pawns }) =>
    specialTargets(pawns, pawn)
      .filter((target) => !protectorFor(pawns, target))
      .map(aimAt),
  perform: ({ pawn, pawns, log, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    pawn.protectingId = target.id
    log.push(label(pawn) + ' protects ' + target.kind + ' #' + target.id + '.')
    return { kind: 'protect', to: { q: target.q, r: target.r }, impacts: [] }
  },
}

export class Bulwark extends Pawn {
  static override readonly startsOnFrontRow = true
  static override readonly icon = 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7L12 3Zm0 0v18M3 7l9 4 9-4'
  readonly kind = 'bulwark' as const
  get maxHp(): number {
    return 10
  }
  override get moveCost(): number {
    return 2
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return protect
  }
}
