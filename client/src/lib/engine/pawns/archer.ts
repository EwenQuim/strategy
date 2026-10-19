import {
  aimAt,
  attackTargets,
  inAttackRange,
  pawnAt,
  specialTargets,
  strike,
} from '../combat.ts'
import { hexDist, key } from '../hex.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const aimedShot: SpecialAbility = {
  name: 'aimedShot',
  cost: 2,
  targeted: true,
  noTargets: 'noEnemiesInRange',
  description: 'aimedShotDescription',
  reaches: (pawn, tile, tiles) => inAttackRange(pawn, tile, tiles.get(key(pawn.q, pawn.r))),
  targets: (pawn, pawns, from = pawn) => attackTargets(pawn, pawns, from),
  candidates: (pawn, { pawns, tiles }) =>
    specialTargets(pawns, pawn, tiles.get(key(pawn.q, pawn.r))).map(aimAt),
  perform: ({ pawn, pawns, tiles, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (
      !target ||
      !specialTargets(pawns, pawn, tiles.get(key(pawn.q, pawn.r))).includes(target)
    )
      return null
    pawn.energy -= pawn.special.cost
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts: [strike(pawns, target, pawn.attack)],
    }
  },
}

const MELEE_CONTACT = 10

// An archer cannot shoot an adjacent enemy, so it keeps its distance.
const archerAi: PawnAi = {
  ...defaultAi,
  goal: (archer, surroundings) =>
    defaultAi.goal(archer, surroundings) -
    surroundings.foes.filter((foe) => hexDist(archer, foe) === 1).length * MELEE_CONTACT,
}

export class Archer extends Pawn {
  static override readonly accent = '#6a9a5b'
  static override readonly icon = 'M5 3c14 0 14 18 0 18V3Zm0 9h16m-4-4 4 4-4 4'
  readonly kind = 'archer' as const
  static override readonly aiInstructions =
    'Shot (2): 2 damage at distance 2-3, never adjacent; +1 range on a watchtower. Once per activation.'
  readonly attack: AttackProfile = { damage: 2, minRange: 2, maxRange: 3, rangeBonus: 1 }
  get special(): SpecialAbility {
    return aimedShot
  }
  override get ai(): PawnAi {
    return archerAi
  }
}
