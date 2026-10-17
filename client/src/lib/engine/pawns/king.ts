import {
  aimAt,
  allyTargets,
  attackTargets,
  label,
  pawnAt,
  specialTargets,
  strike,
} from '../combat.ts'
import { hexDist } from '../hex.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const rally: SpecialAbility = {
  name: 'rally',
  cost: 2,
  targeted: true,
  noTargets: 'noEnemiesWithinReach',
  prompt: 'chooseEnemy',
  description: 'rallyDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) === 1,
  targets: attackTargets,
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, tile, log }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const impacts = [strike(pawns, pawn, target, pawn.attack, log)]
    const allies = allyTargets(pawn, pawns, true)
    for (const ally of allies) {
      ally.hp = Math.min(ally.maxHp, ally.hp + 1)
      log.push(label(ally) + ' recovers 1 health.')
    }
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts,
      support: { kind: 'heal', recipients: allies.map(({ q, r }) => ({ q, r })) },
    }
  },
}

const KING_SCORE = { king: 1000, health: 30, lethalThreat: 100_000 }
const SAFE_DAMAGE = 30
const HEALTHY_HP = 5
const HEALTHY_DAMAGE = 10
const DANGER_DAMAGE = 120
const DANGER_MARGIN = 2
const ALLY_DISTANCE = 0.5
// Staying beside a wounded ally must be worth less than healing it.
const RALLY_READY = 3
const FIGHTING_AGGRESSION = 8

const soldiers = (army: readonly Pawn[]) => army.filter((pawn) => pawn.kind !== 'king').length

// Damage the king can absorb while keeping a margin is cheap; closer to death it is dear.
const kingAi: PawnAi = {
  value: (_king, health) => KING_SCORE.king + health * KING_SCORE.health,
  risk: (king, { incoming, health, hellfireDamage }) => {
    const threat = incoming + hellfireDamage
    const absorbed = Math.min(threat, Math.max(0, health - DANGER_MARGIN))
    return (
      absorbed * (king.hp >= HEALTHY_HP ? HEALTHY_DAMAGE : SAFE_DAMAGE) +
      (threat - absorbed) * DANGER_DAMAGE +
      (incoming >= health ? KING_SCORE.lethalThreat : 0)
    )
  },
  // A commander stays close and next to wounded allies; ahead or in the endgame it fights.
  goal: (king, surroundings) => {
    const { allies, foes } = surroundings
    const warrior = soldiers(allies) >= 2 * soldiers(foes) || soldiers(foes) <= 2
    if (!allies.length || warrior)
      return defaultAi.goal(king, {
        ...surroundings,
        aggression: surroundings.aggression * FIGHTING_AGGRESSION,
      })
    const wounded = allies.filter((ally) => ally.hp < ally.maxHp && hexDist(king, ally) === 1)
    return (
      -Math.min(...allies.map((ally) => hexDist(king, ally))) * ALLY_DISTANCE +
      wounded.length * RALLY_READY
    )
  },
}

export class King extends Pawn {
  static override readonly accent = '#f0d38e'
  static override readonly icon = 'm3 6 4 4 5-7 5 7 4-4-2 12H5L3 6ZM6 21h12'
  readonly kind = 'king' as const
  static override readonly aiInstructions =
    'Exalting Assault (2): strike an adjacent enemy for 2 and heal every adjacent ally for 1, up to its maximum health. Cannot heal yourself. Once per activation.'
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
