import type { Axial, Tile } from '../hex.ts'
import type { Action, BattleEffect, GameState } from '../engine.ts'
import type { PawnKind } from './index.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'

export type Side = 'player' | 'enemy'

export const START_ENERGY = 3

export interface AttackProfile {
  readonly damage: number
  readonly minRange: number
  readonly maxRange: number
  readonly rangeBonus?: number
}

type SpecialContext = {
  pawn: Pawn
  tiles: Map<string, Tile>
  pawns: Pawn[]
  tile?: Axial
  destination?: Axial
  round: number
  log: string[]
}

export type SpecialResult = Omit<BattleEffect, 'from'>

export type ThreatPosition = {
  target: Pawn
  from: Axial
  movementCost: number
  tiles?: Map<string, Tile>
  pawns?: readonly Pawn[]
}

export type SpecialTextKey =
  | 'rally'
  | 'rallyDescription'
  | 'noAlliesToHeal'
  | 'charge'
  | 'chargeDescription'
  | 'noEnemiesWithinReach'
  | 'chargeTo'
  | 'chooseTile'
  | 'chooseTileOrEnemy'
  | 'chooseEnemy'
  | 'chooseEnemyOrAlly'
  | 'noAdjacentEnemiesOrAllies'
  | 'aimedShot'
  | 'aimedShotDescription'
  | 'noEnemiesInRange'
  | 'fireball'
  | 'fireballDescription'
  | 'fireballToward'
  | 'chooseDirection'
  | 'bomb'
  | 'bombDescription'
  | 'protect'
  | 'protectDescription'
  | 'chooseAlly'
  | 'noNearbyAllies'
  | 'jump'
  | 'jumpDescription'
  | 'jumpTo'
  | 'phalanx'
  | 'phalanxDescription'
  | 'cry'
  | 'cryDescription'
  | 'fury'
  | 'furyDescription'
  | 'dash'
  | 'dashDescription'
  | 'dashTo'
  | 'noOpenLine'

export interface SpecialAbility {
  readonly name: SpecialTextKey
  readonly cost: number
  // Base signature damage; defaults to the pawn's attack profile. Zero means no offense.
  readonly damage?: number
  // Briefing stat chip range; defaults to the pawn's attack range.
  readonly range?: string
  readonly description: SpecialTextKey
  readonly targeted: boolean
  // A targeted signature that still works without one: it moves and skips the strike.
  readonly targetOptional?: boolean
  readonly choosesDestination?: boolean
  readonly movement?: 'walk' | 'jump'
  readonly landingRange?: number
  readonly targetLabel?: SpecialTextKey
  readonly prompt?: SpecialTextKey
  readonly noTargets?: SpecialTextKey
  targets(pawn: Pawn, pawns: readonly Pawn[], from?: Axial): Pawn[]
  reaches(pawn: Pawn, tile: Tile, tiles: Map<string, Tile>): boolean
  tileTargets?(pawn: Pawn, tiles: Map<string, Tile>, pawns: Pawn[]): Set<string>
  areaTargets?(pawns: readonly Pawn[], tile: Axial, pawn: Pawn): Pawn[]
  perform(context: SpecialContext): SpecialResult | null
  candidates(pawn: Pawn, state: GameState): Action[]
  threat?(pawn: Pawn, position: ThreatPosition): number
  threatenedTiles?(pawn: Pawn, tiles: Map<string, Tile>, pawns: Pawn[]): Set<string>
}

export abstract class Pawn {
  static readonly startsOnFrontRow: boolean = false
  static readonly icon: string
  static readonly accent: string
  // One line describing what this pawn class does, for remote AI prompts. Kept in English
  // on purpose: model-facing prompt text, not UI. Every subclass declares it.
  static readonly aiInstructions: string
  abstract readonly kind: PawnKind
  abstract readonly attack: AttackProfile
  abstract get special(): SpecialAbility
  get ai(): PawnAi {
    return defaultAi
  }
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
  ) {
    this.id = id
    this.q = q
    this.r = r
    this.side = side
    this.hp = hp ?? this.maxHp
    this.energy = energy
  }

  endTurn(): void {
    this.energy = 0
  }

  clone(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this)
  }
}
