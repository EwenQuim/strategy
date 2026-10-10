import { label, specialTargets } from '../combat.ts'
import { hexDist } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const rattle: SpecialAbility = {
  name: 'rattle',
  cost: 1,
  targeted: false,
  oncePerRound: true,
  noTargets: 'noSkeletonsNearby',
  description: 'rattleDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) === 1,
  targets: (pawn, pawns) =>
    pawns.filter(
      (ally) =>
        ally.side === pawn.side && ally.kind === 'skeleton' && hexDist(pawn, ally) === 1,
    ),
  candidates: (pawn, { pawns }) =>
    specialTargets(pawns, pawn).length ? [{ type: 'special' }] : [],
  perform: ({ pawn, pawns, log }) => {
    const allies = specialTargets(pawns, pawn)
    if (!allies.length) return null
    pawn.energy -= pawn.specialCost
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

// Not a recruit: the skeleton only enters a battle through a Necromancer's Summon.
export class Skeleton extends Pawn {
  static override readonly accent = '#cfc9b9'
  static override readonly icon =
    'M12 3a8 8 0 0 0-8 8c0 2.3 1.3 4.3 3 5.3V20h10v-3.7c1.7-1 3-3 3-5.3a8 8 0 0 0-8-8ZM9 11h.01M15 11h.01M12 13.5l-1 2h2Z'
  static override readonly aiInstructions =
    'melee, 1 damage, 2 health, +1 damage per adjacent friendly skeleton. Rattle (1): +1 energy to each adjacent friendly skeleton, once per round.'
  readonly kind = 'skeleton' as const
  get maxHp(): number {
    return 2
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 1 }
  // Flood: every adjacent friendly skeleton makes its blows hit harder.
  override floodDamage(pawns: readonly Pawn[]): number {
    return pawns.filter(
      (ally) =>
        ally.side === this.side && ally.kind === 'skeleton' && hexDist(this, ally) === 1,
    ).length
  }
  get special(): SpecialAbility {
    return rattle
  }
}
