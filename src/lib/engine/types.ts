import type { Pawn, Side } from './pawns.ts'

export type Axial = { q: number; r: number }
export type Biome = 'verdant' | 'mountains' | 'desert'
export type Terrain = 'plain' | 'forest' | 'mountain' | 'lake' | 'sand'
export type Tile = { q: number; r: number; terrain: Terrain }
export type Phase = 'move' | 'attack' | 'special' | 'charge' | 'over'

export type PawnPlacement = {
  readonly kind: Pawn['kind']
  readonly col: number
  readonly row: number
}

export type FixedBattleSetup = {
  readonly biome: Biome
  readonly map: readonly string[]
  readonly player: readonly PawnPlacement[]
  readonly enemy: readonly PawnPlacement[]
}

export type BattleSetup =
  | FixedBattleSetup
  | {
      readonly biome: Biome
      readonly map?: undefined
      readonly player: readonly Pawn['kind'][]
      readonly enemy: readonly Pawn['kind'][]
    }

export type GameState = {
  seed: string
  readonly setup?: BattleSetup
  biome: Biome
  randomState: number
  tiles: Map<string, Tile>
  pawns: Pawn[]
  order: number[]
  active: number
  round: number
  phase: Phase
  chargeDestination: Axial | null
  winner: Side | null
  log: string[]
  logCount: number
}

export type BattleImpact = Axial & { damage: number }

export type BattleEffect = {
  kind: 'move' | 'attack' | 'rally' | 'fireball' | 'escape' | 'protect'
  from: Axial
  to: Axial
  impacts?: BattleImpact[]
}

export type BattleFrame = { state: GameState; effect: BattleEffect | null }
export type Transition = { state: GameState; frames: BattleFrame[] }

export type Action =
  | { type: 'move'; q: number; r: number }
  | { type: 'act'; action: 'attack' | 'special' }
  | { type: 'attackAt'; q: number; r: number }
  | { type: 'specialAt'; q: number; r: number }
  | { type: 'cancelTargeting' }
  | { type: 'endTurn' }
  | { type: 'restart' }
