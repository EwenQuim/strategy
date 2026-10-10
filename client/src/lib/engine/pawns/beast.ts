import { label, specialTargets, strike } from '../combat.ts'
import { hexDist } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const rampage: SpecialAbility = {
  name: 'rampage',
  cost: 3,
  targeted: false,
  oncePerRound: true,
  noTargets: 'noEnemiesWithinReach',
  description: 'rampageDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) === 1,
  targets: (pawn, pawns) =>
    pawns.filter((foe) => foe.side !== pawn.side && hexDist(pawn, foe) === 1),
  candidates: (pawn, { pawns }) =>
    specialTargets(pawns, pawn).length ? [{ type: 'special' }] : [],
  threat: (pawn, { target, from, movementCost }) =>
    hexDist(from, target) === 1 && pawn.energy >= movementCost + pawn.specialCost
      ? pawn.attack.damage
      : 0,
  perform: ({ pawn, pawns, log, random }) => {
    const foes = specialTargets(pawns, pawn)
    if (!foes.length) return null
    pawn.energy -= pawn.specialCost
    pawn.specialUsed = true
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const impacts = foes.map((foe) => strike(pawns, pawn, foe, { ...pawn.attack }, log, random))
    return { kind: 'attack', to: { q: pawn.q, r: pawn.r }, impacts }
  },
}

// Not a recruit: the beast only enters a battle by waking from an authored den.
export class Beast extends Pawn {
  static override readonly accent = '#c98b4a'
  static override readonly icon =
    'M12 4c2 0 3 1.4 3 3.3S13.4 11 12 11 9 9.2 9 7.3 10 4 12 4ZM6 8c1.4 0 2.3 1 2.3 2.4S7.2 13 6 13s-2-1.2-2-2.6S4.6 8 6 8Zm12 0c1.4 0 2.3 1 2.3 2.4S18.8 13 18 13s-2-1.2-2-2.6S16.6 8 18 8ZM12 13c3 0 5 2.2 5 4.2S14.5 20 12 20s-5-.8-5-2.8 2-4.2 5-4.2Z'
  static override readonly aiInstructions =
    'melee, 2 damage, 6 health. Rampage (3): strike every adjacent enemy for 2, once per round.'
  readonly kind = 'beast' as const
  get maxHp(): number {
    return 6
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  // Frenzy: every banked energy point adds 1 damage to the beast's basic attacks.
  override adrenalineDamage(): number {
    return this.adrenaline
  }
  get special(): SpecialAbility {
    return rampage
  }
}
