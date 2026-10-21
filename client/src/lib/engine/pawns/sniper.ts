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

const sniperShot: SpecialAbility = {
  name: 'sniperShot',
  cost: 3,
  targeted: true,
  noTargets: 'noEnemiesInRange',
  description: 'sniperShotDescription',
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

// A sniper cannot shoot an adjacent enemy, so it keeps its distance.
const sniperAi: PawnAi = {
  ...defaultAi,
  goal: (sniper, surroundings) =>
    defaultAi.goal(sniper, surroundings) -
    surroundings.foes.filter((foe) => hexDist(sniper, foe) === 1).length * MELEE_CONTACT,
}

export class Sniper extends Pawn {
  static override readonly accent = '#6b8fb5'
  static override readonly icon = 'M12 2v3m0 14v3M2 12h3m14 0h3M12 6a6 6 0 1 1 0 12 6 6 0 1 1 0-12m3.5 2.5L21 5'
  readonly kind = 'sniper' as const
  static override readonly aiInstructions =
    'Sniper shot (3): 3 damage at distance 2-4, up to 5 on a watchtower; never adjacent. Costs the whole round energy, so it cannot move and shoot the same round. Once per activation.'
  readonly attack: AttackProfile = { damage: 3, minRange: 2, maxRange: 4, rangeBonus: 1 }
  get special(): SpecialAbility {
    return sniperShot
  }
  override get ai(): PawnAi {
    return sniperAi
  }
}
