export type Side = 'player' | 'enemy'

export const START_ENERGY = 3
export const ESCAPE_BONUS = 20
export const MAX_ESCAPE = 60

export interface AttackProfile {
  readonly damage: number
  readonly minRange: number
  readonly maxRange: number
  readonly ignoresEscape?: boolean
}

export interface SpecialAbility {
  readonly name: string
  readonly cost: number
  readonly description: string
}

export abstract class Pawn {
  abstract readonly kind: 'king' | 'swordsman' | 'archer' | 'magician'
  abstract readonly attack: AttackProfile
  abstract readonly special: SpecialAbility
  readonly maxEnergy = START_ENERGY
  readonly id: number
  readonly side: Side
  q: number
  r: number
  hp: number
  energy: number
  escapeChance: number
  specialUsed = false

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
  readonly special: SpecialAbility = {
    name: 'Charge',
    cost: 2,
    description:
      'Choose a tile up to 2 steps away, then an adjacent enemy. Move and strike for 2 damage. Mountains and occupied tiles block the path.',
  }
}

export class King extends Pawn {
  readonly kind = 'king' as const
  get maxHp(): number {
    return 7
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  readonly special: SpecialAbility = {
    name: 'Rally',
    cost: 1,
    description:
      'Restore 1 health to an adjacent ally, once per round. Cannot heal yourself or exceed maximum health.',
  }
}

export class Archer extends Pawn {
  readonly kind = 'archer' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 2, maxRange: 3 }
  readonly special: SpecialAbility = {
    name: 'Aimed shot',
    cost: 2,
    description:
      'Deal 2 damage to an enemy 2 to 3 tiles away, ignoring Escape. Cannot shoot adjacent enemies.',
  }
}

export class Magician extends Pawn {
  readonly kind = 'magician' as const
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  readonly special: SpecialAbility = {
    name: 'Fireball',
    cost: 2,
    description:
      'Target an enemy within 2 tiles. Deal 1 damage to it and every adjacent enemy. Each may Escape; allies are unharmed.',
  }
}
