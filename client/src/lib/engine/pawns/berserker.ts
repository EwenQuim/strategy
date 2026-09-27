import { aimAt, canAttack, label, specialTargets, strike } from '../combat.ts'
import { hexDist } from '../hex.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const fury: SpecialAbility = {
  name: 'fury',
  cost: 1,
  targeted: true,
  oncePerRound: true,
  noTargets: 'noEnemiesWithinReach',
  description: 'furyDescription',
  targets: (pawn, pawns, from = pawn) =>
    pawns.filter((foe) => canAttack(pawn, foe, from) && hexDist(from, foe) === 1),
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  threat: (pawn, { target, from, movementCost }) => {
    if (hexDist(from, target) !== 1 || !canAttack(pawn, target, from)) return 0
    if (pawn.energy < movementCost + pawn.special.cost) return 0
    const boost = pawn.energy - movementCost - pawn.special.cost
    return (pawn.attack.damage + boost) * 2
  },
  perform: ({ pawn, pawns, log, random, tile }) => {
    const target = pawns.find(
      (foe) =>
        foe.q === tile?.q && foe.r === tile?.r && specialTargets(pawns, pawn).includes(foe),
    )
    if (!tile || !target) return null
    const boost = pawn.energy - pawn.special.cost
    if (boost < 0) return null
    pawn.energy = 0
    pawn.specialUsed = true
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts: [
        strike(
          pawns,
          pawn,
          target,
          { ...pawn.attack, damage: pawn.attack.damage + boost, ignoresEscape: true },
          log,
          random,
        ),
      ],
    }
  },
}

const DESPERATION_REACH = 6
// A berserker only grows more dangerous as it wounds, so it stays reckless in a corner.
const berserkerAi: PawnAi = {
  ...defaultAi,
  goal: (berserker, surroundings) =>
    defaultAi.goal(berserker, surroundings) +
    (berserker.hp === 1 ? DESPERATION_REACH : 0) +
    surroundings.foes.filter((foe) => hexDist(berserker, foe) === 1).length * 2,
  risk: (berserker, threat) =>
    defaultAi.risk(berserker, { ...threat, caution: threat.caution * 0.5 }),
}

export class Berserker extends Pawn {
  static override readonly startsOnFrontRow = true
  static override readonly icon =
    'M12 3c2 4 2 5 4 5m-4-5C10 7 10 8 8 8m4-5v18m-4-4h8m-6-4h4M5 17c2-1 4-1 7-1s5 0 7 1'
  readonly kind = 'berserker' as const
  get maxHp(): number {
    return 3
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return fury
  }
  override get ai(): PawnAi {
    return berserkerAi
  }
}
