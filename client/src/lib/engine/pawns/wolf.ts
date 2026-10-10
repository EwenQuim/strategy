import { label, specialTargets } from '../combat.ts'
import { hexDist } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const cry: SpecialAbility = {
  name: 'cry',
  cost: 2,
  targeted: false,
  oncePerRound: true,
  noTargets: 'noNearbyAllies',
  prompt: 'chooseAlly',
  description: 'cryDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) <= 2,
  targets: (pawn, pawns) =>
    pawns.filter(
      (ally) => ally.side === pawn.side && ally.id !== pawn.id && hexDist(pawn, ally) <= 2,
    ),
  candidates: (pawn, { pawns }) =>
    specialTargets(pawns, pawn).length ? [{ type: 'special' }] : [],
  perform: ({ pawn, pawns, log }) => {
    const allies = specialTargets(pawns, pawn)
    if (!allies.length) return null
    pawn.paySpecial()
    pawn.specialUsed = true
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    for (const ally of allies) {
      ally.energy += 1
      ally.bonusEnergy += 1
      log.push(label(ally) + ' gains 1 energy.')
    }
    return { kind: 'rally', to: { q: pawn.q, r: pawn.r } }
  },
}

export class Wolf extends Pawn {
  static override readonly startsOnFrontRow = true
  static override readonly accent = '#8a9a8a'
  static override readonly icon = 'M5 4l4 3h6l4-3v5l-3 5-4 7-4-7-3-5V4Zm4 7h.01m6 0h.01'
  readonly kind = 'wolf' as const
  static override readonly aiInstructions =
    'melee, 2 damage. Cry (2): +1 energy to every ally within 2 tiles, once per round.'
  get maxHp(): number {
    return 3
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  // Rage: every banked energy point adds 1 damage to the wolf's basic attacks.
  override adrenalineDamage(): number {
    return this.adrenaline
  }
  get special(): SpecialAbility {
    return cry
  }
}
