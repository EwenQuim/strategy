import { aimAt, canAttack, label, pawnAt, protectorFor, specialTargets } from '../combat.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'
import { hexDist, key } from '../hex.ts'

const protect: SpecialAbility = {
  name: 'protect',
  cost: 2,
  targeted: true,
  prompt: 'chooseAlly',
  noTargets: 'noNearbyAllies',
  description: 'protectDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) <= 2,
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
    pawn.energy -= pawn.specialCost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    pawn.protectingId = target.id
    log.push(label(pawn) + ' protects ' + target.kind + ' #' + target.id + '.')
    return { kind: 'protect', to: { q: target.q, r: target.r }, impacts: [] }
  },
}

const bulwarkAi: PawnAi = {
  ...defaultAi,
  ruleSpecial: (_bulwark, state, foes, allies) => {
    const threatened = allies
      .filter(
        (ally) =>
          !protectorFor(state.pawns, ally) &&
          foes.some((foe) => canAttack(foe, ally, state.tiles.get(key(foe.q, foe.r)))),
      )
      .sort((a, b) => Number(b.kind === 'king') - Number(a.kind === 'king') || a.hp - b.hp)[0]
    return threatened ? aimAt(threatened) : null
  },
}

export class Bulwark extends Pawn {
  static override readonly startsOnFrontRow = true
  static override readonly accent = '#b59a6b'
  static override readonly icon =
    'M12 3 4 6v6c0 5 8 8.5 8 8.5s8-3.5 8-8.5V6l-8-3ZM8 10l4 3 4-3M8 14l4 3 4-3'
  static override readonly aiInstructions =
    'melee, 1 damage; its own moves cost 2 energy for the first tile. Protect (2): shield an ally within 2 tiles and take its next hit, wherever it goes.'
  readonly kind = 'bulwark' as const
  get maxHp(): number {
    return 10
  }
  override get moveCost(): number {
    return 2
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 1 }
  // Brace: every banked energy point absorbs 1 damage from an incoming blow.
  override adrenalineArmor(): number {
    return this.adrenaline
  }
  get special(): SpecialAbility {
    return protect
  }
  override get ai(): PawnAi {
    return bulwarkAi
  }
}
