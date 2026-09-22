import { aimedShot, charge, fireball, jump, protect, rally } from './combat.ts'
import type { Axial, BattleEffect, BattleImpact, Tile } from './types.ts'
import type { SeededRandom } from './random.ts'

export type Side = 'player' | 'enemy'

export const START_ENERGY = 3
export const ESCAPE_BONUS = 20
export const MAX_ESCAPE = 60

export interface AttackProfile {
  readonly damage: number
  readonly minRange: number
  readonly maxRange: number
  readonly rangeBonus?: number
  readonly ignoresEscape?: boolean
}

type SpecialContext = {
  pawn: Pawn
  tiles: Map<string, Tile>
  pawns: Pawn[]
  tile?: Axial
  destination?: Axial
  round: number
  log: string[]
  random: SeededRandom
}

export type SpecialResult = {
  kind: BattleEffect['kind']
  to: Axial
  impacts: BattleImpact[]
}

export interface SpecialAbility {
  readonly name: string
  readonly cost: number
  readonly description: string
  readonly targeted: boolean
  readonly oncePerRound?: boolean
  readonly choosesDestination?: boolean
  targets(pawn: Pawn, pawns: readonly Pawn[], from?: Axial): Pawn[]
  tileTargets?(pawn: Pawn, tiles: Map<string, Tile>, pawns: Pawn[]): Set<string>
  perform(context: SpecialContext): SpecialResult | null
}

export abstract class Pawn {
  abstract readonly kind: 'king' | 'swordsman' | 'archer' | 'magician' | 'ninja' | 'bulwark'
  abstract readonly attack: AttackProfile
  abstract get special(): SpecialAbility
  bonusEnergy = 0
  springSince: number | null = null

  get maxEnergy(): number {
    return START_ENERGY + this.bonusEnergy
  }
  readonly id: number
  readonly side: Side
  q: number
  r: number
  hp: number
  energy: number
  escapeChance: number
  specialUsed = false
  protectingId: number | null = null

  get moveCost(): number {
    return 1
  }

  moveEnergyCost(steps: number): number {
    return steps === 0 ? 0 : steps + this.moveCost - 1
  }

  get maxHp(): number {
    return 3
  }

  constructor(
    id: number,
    q: number,
    r: number,
    side: Side,
    hp?: number,
    energy = START_ENERGY,
    escapeChance = 0,
  ) {
    this.id = id
    this.q = q
    this.r = r
    this.side = side
    this.hp = hp ?? this.maxHp
    this.energy = energy
    this.escapeChance = escapeChance
  }

  get endTurnEscapeChance(): number {
    return Math.min(MAX_ESCAPE, this.escapeChance + this.energy * ESCAPE_BONUS)
  }

  endTurn(): void {
    this.escapeChance = this.endTurnEscapeChance
    this.energy = 0
  }

  clone(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this)
  }
}

export class Swordsman extends Pawn {
  readonly kind = 'swordsman' as const
  get maxHp(): number {
    return 5
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return charge
  }
}

export class King extends Pawn {
  readonly kind = 'king' as const
  get maxHp(): number {
    return 7
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return rally
  }
}

export class Archer extends Pawn {
  readonly kind = 'archer' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 2, maxRange: 3, rangeBonus: 1 }
  get special(): SpecialAbility {
    return aimedShot
  }
}

export class Magician extends Pawn {
  readonly kind = 'magician' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2, rangeBonus: 1 }
  get special(): SpecialAbility {
    return fireball
  }
}

export class Ninja extends Pawn {
  readonly kind = 'ninja' as const
  get maxHp(): number {
    return 1
  }
  readonly attack: AttackProfile = { damage: 5, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return jump
  }
}

export class Bulwark extends Pawn {
  readonly kind = 'bulwark' as const
  get maxHp(): number {
    return 10
  }
  override get moveCost(): number {
    return 2
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return protect
  }
}

export const RECRUIT_CLASSES = [Swordsman, Archer, Magician, Ninja, Bulwark] as const
