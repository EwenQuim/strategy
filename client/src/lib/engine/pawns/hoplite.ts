import { aimAt, canAttack, label, pawnAt, protectorFor, specialTargets } from '../combat.ts'
import { hexDist, key } from '../hex.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const phalanx: SpecialAbility = {
  name: 'phalanx',
  cost: 1,
  targeted: true,
  prompt: 'chooseAlly',
  noTargets: 'noNearbyAllies',
  description: 'phalanxDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) === 1,
  targets: (pawn, pawns) =>
    pawns.filter(
      (target) =>
        target.side === pawn.side && target.id !== pawn.id && hexDist(pawn, target) <= 1,
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
    log.push(label(pawn) + ' shields ' + target.kind + ' #' + target.id + '.')
    return { kind: 'protect', to: { q: target.q, r: target.r }, impacts: [] }
  },
}

const hopliteAi: PawnAi = {
  ...defaultAi,
  ruleSpecial: (_hoplite, state, foes, allies) => {
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

export class Hoplite extends Pawn {
  static override readonly startsOnFrontRow = true
  static override readonly accent = '#4a8a8a'
  static override readonly icon =
    'M12 3a8 8 0 0 1 8 8v10H4V11a8 8 0 0 1 8-8Zm-3 8h1.5m3.5 0h1.5M12 3V1M8.5 3.5 7 1.5m8.5 2L17 1.5'
  static override readonly aiInstructions =
    '1 damage at distance 1-2. Phalanx (1): shield an adjacent ally and take its next hit.'
  readonly kind = 'hoplite' as const
  get maxHp(): number {
    return 5
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  get special(): SpecialAbility {
    return phalanx
  }
  override get ai(): PawnAi {
    return hopliteAi
  }
}
