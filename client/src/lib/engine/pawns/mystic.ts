import { aimAt, label, pawnAt, specialTargets } from '../combat.ts'
import { hexDist } from '../hex.ts'
import { MAX_ESCAPE, Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const VEIL_STEP = 25

const veil: SpecialAbility = {
  name: 'veil',
  cost: 1,
  targeted: true,
  prompt: 'chooseAlly',
  noTargets: 'noNearbyAllies',
  description: 'veilDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) <= 2,
  targets: (pawn, pawns) =>
    pawns.filter(
      (target) =>
        target.side === pawn.side &&
        hexDist(pawn, target) <= 2 &&
        target.escapeChance < MAX_ESCAPE,
    ),
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, log, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.paySpecial()
    target.escapeChance = Math.min(MAX_ESCAPE, target.escapeChance + VEIL_STEP)
    target.veiledBy = pawn.id
    log.push(
      label(pawn) +
        ' veils ' +
        target.kind +
        ' #' +
        target.id +
        ': ' +
        target.escapeChance +
        '% escape.',
    )
    return { kind: 'protect', to: { q: target.q, r: target.r }, impacts: [] }
  },
}

export class Mystic extends Pawn {
  static override readonly accent = '#9b7fd1'
  static override readonly icon =
    'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'
  static override readonly aiInstructions =
    'ranged, 1 damage at distance 1-2. Veil (1): give itself or an ally within 2 tiles +25% Escape, up to 75%, against every attack until its next turn; repeatable.'
  readonly kind = 'mystic' as const
  get maxHp(): number {
    return 2
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  get special(): SpecialAbility {
    return veil
  }
}
