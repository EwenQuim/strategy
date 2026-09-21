export type Side = 'player' | 'enemy'

export const START_HP = 3
export const START_ENERGY = 3

export abstract class Pawn {
  abstract readonly kind: 'king' | 'swordsman'
  readonly maxEnergy = START_ENERGY
  readonly maxHp = START_HP
  readonly id: number
  readonly side: Side
  q: number
  r: number
  hp: number
  energy: number
  defending: boolean
  constructor(
    id: number,
    q: number,
    r: number,
    side: Side,
    hp = START_HP,
    energy = START_ENERGY,
    defending = false,
  ) {
    this.id = id
    this.q = q
    this.r = r
    this.side = side
    this.hp = hp
    this.energy = energy
    this.defending = defending
  }
  clone(): Pawn {
    const Ctor = this.constructor as new (...args: ConstructorParameters<typeof Pawn>) => Pawn
    return new Ctor(this.id, this.q, this.r, this.side, this.hp, this.energy, this.defending)
  }
}

export class Swordsman extends Pawn {
  readonly kind = 'swordsman' as const
}

export class King extends Pawn {
  readonly kind = 'king' as const
}
