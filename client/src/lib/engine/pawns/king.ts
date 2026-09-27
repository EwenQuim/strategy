import { allyTargets, label, specialTargets } from '../combat.ts'
import { hexDist } from '../hex.ts'
import { defaultAi, reachableMoves, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const rally: SpecialAbility = {
  name: 'rally',
  cost: 1,
  targeted: false,
  oncePerRound: true,
  noTargets: 'noAlliesToHeal',
  description: 'rallyDescription',
  targets: (pawn, pawns) => allyTargets(pawn, pawns, true),
  candidates: (pawn, { pawns }) =>
    specialTargets(pawns, pawn).length ? [[{ type: 'act', action: 'special' }]] : [],
  perform: ({ pawn, pawns, log }) => {
    const allies = specialTargets(pawns, pawn)
    if (!allies.length) return null
    pawn.energy -= pawn.special.cost
    pawn.specialUsed = true
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    for (const ally of allies) {
      ally.hp = Math.min(ally.maxHp, ally.hp + 1)
      log.push(label(ally) + ' recovers 1 health.')
    }
    return { kind: 'rally', to: { q: pawn.q, r: pawn.r } }
  },
}

const KING_SCORE = { king: 1000, health: 30, lethalThreat: 100_000 }
const SAFE_DAMAGE = 30
const DANGER_DAMAGE = 120
const DANGER_MARGIN = 2
const ALLY_DISTANCE = 0.5
const RALLY_READY = 4

const soldiers = (army: readonly Pawn[]) => army.filter((pawn) => pawn.kind !== 'king').length

// Damage the king can absorb while keeping a margin is cheap; closer to death it is dear.
const kingAi: PawnAi = {
  moves: reachableMoves,
  value: (_king, health) => KING_SCORE.king + health * KING_SCORE.health,
  risk: (_king, { incoming, health, hellfireDamage }) => {
    const threat = incoming + hellfireDamage
    const absorbed = Math.min(threat, Math.max(0, health - DANGER_MARGIN))
    return (
      absorbed * SAFE_DAMAGE +
      (threat - absorbed) * DANGER_DAMAGE +
      (incoming >= health ? KING_SCORE.lethalThreat : 0)
    )
  },
  // A commander stays close and next to wounded allies; ahead or in the endgame it fights.
  goal: (king, surroundings) => {
    const { allies, foes } = surroundings
    const warrior = soldiers(allies) >= 2 * soldiers(foes) || soldiers(foes) <= 2
    if (!allies.length || warrior) return defaultAi.goal(king, surroundings)
    const wounded = allies.filter((ally) => ally.hp < ally.maxHp && hexDist(king, ally) === 1)
    return (
      -Math.min(...allies.map((ally) => hexDist(king, ally))) * ALLY_DISTANCE +
      wounded.length * RALLY_READY
    )
  },
  ruleSpecial: (_king, _state, _foes, specials) =>
    specials.length ? [{ type: 'act', action: 'special' }] : null,
}

export class King extends Pawn {
  static override readonly icon = 'm3 6 4 4 5-7 5 7 4-4-2 12H5L3 6ZM6 21h12'
  readonly kind = 'king' as const
  get maxHp(): number {
    return 7
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return rally
  }
  override get ai(): PawnAi {
    return kingAi
  }
}
