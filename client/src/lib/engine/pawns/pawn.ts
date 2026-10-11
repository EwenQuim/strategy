import type { Axial, Tile } from '../hex.ts'
import type { Action, BattleEffect, GameState } from '../engine.ts'
import type { SeededRandom } from '../random.ts'
import type { PawnKind } from './index.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'

export type Side = 'player' | 'enemy'

export const START_ENERGY = 3
export const ESCAPE_BONUS = 20
export const MAX_ESCAPE = 60

// A unit struck down in this battle, as the battle log and achievements remember them.
export type Unit = { kind: PawnKind; side: Side }

// A unit spawned during a battle: a summoned skeleton or a beast waking from its den.
type SpawnOptions = { hp?: number; energy?: number }
export type PawnSpawner = (
  kind: PawnKind,
  side: Side,
  q: number,
  r: number,
  options?: SpawnOptions,
) => Pawn | null

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
  // Spawns a new pawn during the battle (summoned skeleton, waking beast), or null on an occupied tile.
  spawn: PawnSpawner
}

export type SpecialResult = Omit<BattleEffect, 'from'>

export type ThreatPosition = {
  target: Pawn
  from: Axial
  movementCost: number
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
  | 'summon'
  | 'summonDescription'
  | 'summonTo'
  | 'cannotSummon'
  | 'rattle'
  | 'rattleDescription'
  | 'noSkeletonsNearby'
  | 'rampage'
  | 'rampageDescription'

export interface SpecialAbility {
  readonly name: SpecialTextKey
  readonly cost: number
  readonly description: SpecialTextKey
  readonly targeted: boolean
  readonly oncePerRound?: boolean
  readonly choosesDestination?: boolean
  readonly targetLabel?: SpecialTextKey
  readonly prompt?: SpecialTextKey
  readonly noTargets?: SpecialTextKey
  targets(pawn: Pawn, pawns: readonly Pawn[], from?: Axial): Pawn[]
  reaches(pawn: Pawn, tile: Tile, tiles: Map<string, Tile>): boolean
  tileTargets?(
    pawn: Pawn,
    tiles: Map<string, Tile>,
    pawns: Pawn[],
    state: GameState,
  ): Set<string>
  areaTargets?(pawns: readonly Pawn[], tile: Axial, pawn: Pawn): Pawn[]
  perform(context: SpecialContext): SpecialResult | null
  candidates(pawn: Pawn, state: GameState): Action[]
  threat?(pawn: Pawn, position: ThreatPosition): number
  readonly readyZone?: {
    readonly icon: string
    from(pawn: Pawn, tile: Axial, pawns: readonly Pawn[]): boolean
  }
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

  // Energy banked at the end of the previous turn. Each class spends it its own way through the
  // adrenaline hooks below; banking again at the end of a turn replaces it.
  adrenaline = 0

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

  // Adrenaline hooks: how many banked points this class adds to its blows, reach, armor or
  // stride. Zero by default; classes override the ones that define them.
  adrenalineDamage(): number {
    return 0
  }

  adrenalineRange(): number {
    return 0
  }

  adrenalineArmor(): number {
    return 0
  }

  adrenalineSteps(): number {
    return 0
  }

  // Flood: how many extra damage this class adds to its basic attacks per adjacent friendly
  // skeleton. Only the skeleton defines it.
  floodDamage(_pawns: readonly Pawn[]): number {
    return 0
  }

  // Escape banked at the end of a turn. Only the swordsman keeps the old conversion, and only
  // while an enemy stands next to it.
  endTurnEscape(_pawns: readonly Pawn[]): number {
    return 0
  }

  get specialCost(): number {
    return this.special.cost
  }

  payMove(steps: number): void {
    this.energy -= this.moveEnergyCost(steps)
  }

  paySpecial(): void {
    this.energy -= this.specialCost
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

  endTurn(pawns: readonly Pawn[] = []): void {
    this.adrenaline = this.energy
    this.escapeChance = this.endTurnEscape(pawns)
    this.energy = 0
  }

  clone(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this)
  }
}
