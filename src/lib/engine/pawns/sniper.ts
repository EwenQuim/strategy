import { aimAt, canUseSpecial, label, pawnAt, specialTargets, strike } from '../combat.ts'
import { hexDist } from '../hex.ts'
import type { Action } from '../types.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const RANGE = 5
const COST = 2

const snipeAim: SpecialAbility = {
  name: 'Snipe',
  cost: COST,
  targeted: true,
  targetLabel: 'Take aim',
  prompt: 'Choose a target',
  noTargets: 'No target in sight',
  description:
    'Spend this turn aiming at an enemy up to 5 tiles away. On your next turn the shot fires automatically for 4 damage, ignoring Escape and cover. Firing costs 1 recoil health.',
  targets: (pawn, pawns) =>
    pawns.filter((p) => p.side !== pawn.side && hexDist(pawn, p) <= RANGE),
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, log, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || target.side === pawn.side || hexDist(pawn, target) > RANGE) return null
    ;(pawn as Sniper).aimedAt = target.id
    pawn.energy = 0
    log.push(label(pawn) + ' takes aim at ' + target.kind + ' #' + target.id + '.')
    return { kind: 'attack', to: { q: target.q, r: target.r } }
  },
}

const snipeFire: SpecialAbility = {
  name: 'Fire',
  cost: COST,
  targeted: false,
  description:
    'Release the aimed shot for 4 damage, ignoring Escape and cover. Costs 1 recoil health.',
  targets: () => [],
  candidates: (pawn) =>
    canUseSpecial(pawn) ? [[{ type: 'act', action: 'special' }] as Action[]] : [],
  perform: ({ pawn, pawns, log, random }) => {
    const self = pawn as Sniper
    const target = pawns.find((p) => p.id === self.aimedAt)
    self.aimedAt = null
    if (!target || target.side === pawn.side || hexDist(pawn, target) > RANGE) {
      log.push(label(pawn) + ' loses the shot.')
      return { kind: 'attack', to: { q: pawn.q, r: pawn.r } }
    }
    pawn.energy -= COST
    const impacts = [
      strike(
        pawns,
        pawn,
        target,
        { ...pawn.attack, damage: 4, ignoresEscape: true },
        log,
        random,
      ),
    ]
    pawn.hp -= 1
    impacts.push({ q: pawn.q, r: pawn.r, damage: 1 })
    log.push(label(pawn) + ' takes 1 recoil damage.')
    if (pawn.hp <= 0) {
      pawns.splice(pawns.indexOf(pawn), 1)
      log.push(label(pawn) + ' has fallen.')
    }
    return { kind: 'attack', to: { q: target.q, r: target.r }, impacts }
  },
}

export class Sniper extends Pawn {
  static override readonly icon =
    'M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'
  readonly kind = 'sniper' as const
  aimedAt: number | null = null
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 3 }
  get special(): SpecialAbility {
    return this.aimedAt !== null ? snipeFire : snipeAim
  }
}
