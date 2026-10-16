import {
  aimAt,
  attackTargets,
  inAttackRange,
  label,
  pawnAt,
  specialTargets,
  strike,
} from '../combat.ts'
import { hexDist, key } from '../hex.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const snipe: SpecialAbility = {
  name: 'snipe',
  cost: 2,
  targeted: true,
  noTargets: 'noEnemiesInRange',
  description: 'snipeDescription',
  reaches: (pawn, tile, tiles) => inAttackRange(pawn, tile, tiles.get(key(pawn.q, pawn.r))),
  targets: (pawn, pawns, from = pawn) => attackTargets(pawn, pawns, from),
  candidates: (pawn, { pawns, tiles }) =>
    specialTargets(pawns, pawn, tiles.get(key(pawn.q, pawn.r))).map(aimAt),
  perform: ({ pawn, pawns, tiles, log, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (
      !target ||
      !specialTargets(pawns, pawn, tiles.get(key(pawn.q, pawn.r))).includes(target)
    )
      return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts: [strike(pawns, pawn, target, pawn.attack, log)],
    }
  },
}

const CLOSE_CONTACT = 10

// A marksman cannot shoot anyone within 2 tiles and falls to any hit, so it avoids closing.
const marksmanAi: PawnAi = {
  ...defaultAi,
  goal: (marksman, surroundings) =>
    defaultAi.goal(marksman, surroundings) -
    surroundings.foes.filter((foe) => hexDist(marksman, foe) <= 2).length * CLOSE_CONTACT,
}

export class Marksman extends Pawn {
  static override readonly accent = '#4a7a8a'
  static override readonly icon =
    'M12 2a10 10 0 0 1 0 20a10 10 0 0 1 0-20zM12 8a4 4 0 0 0 0 8a4 4 0 0 0 0-8zM11 0h2v4h-2zm0 20h2v4h-2zM0 11h4v2H0zm20 0h4v2h-4z'
  readonly kind = 'marksman' as const
  static override readonly aiInstructions =
    'Snipe (2): 1 damage at distance 3-5, never adjacent; +1 range on a watchtower. Only 2 energy: move or shoot, never both. Once per activation.'
  get maxHp(): number {
    return 2
  }
  // Move or shoot, never both: the siege unit cannot kite.
  override get maxEnergy(): number {
    return 2 + this.bonusEnergy
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 3, maxRange: 5, rangeBonus: 1 }
  get special(): SpecialAbility {
    return snipe
  }
  override get ai(): PawnAi {
    return marksmanAi
  }
}
