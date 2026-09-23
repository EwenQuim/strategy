import type { Action, Axial, BattleEffect, GameState, Tile } from '../types.ts'
import type { SeededRandom } from '../random.ts'
import type { PawnKind } from './index.ts'

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

export type SpecialResult = Omit<BattleEffect, 'from'>

export type ThreatPosition = {
  target: Pawn
  targets: Pawn[]
  from: Axial
  movementCost: number
}

export interface SpecialAbility {
  readonly name: string
  readonly cost: number
  readonly description: string
  readonly targeted: boolean
  readonly oncePerRound?: boolean
  readonly choosesDestination?: boolean
  readonly targetLabel?: string
  readonly prompt?: string
  readonly noTargets?: string
  targets(pawn: Pawn, pawns: readonly Pawn[], from?: Axial): Pawn[]
  tileTargets?(pawn: Pawn, tiles: Map<string, Tile>, pawns: Pawn[]): Set<string>
  perform(context: SpecialContext): SpecialResult | null
  candidates(pawn: Pawn, state: GameState): Action[][]
  threat?(pawn: Pawn, position: ThreatPosition): number
}

export abstract class Pawn {
  static readonly startsOnFrontRow: boolean = false
  static readonly icon: string
  abstract readonly kind: PawnKind
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
