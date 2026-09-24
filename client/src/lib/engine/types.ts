import type { Biome } from './biomes/index.ts'
import type { Pawn, Side } from './pawns/index.ts'

export type Axial = { q: number; r: number }
export type Terrain =
  'plain' | 'forest' | 'mountain' | 'lake' | 'sand' | 'palm' | 'basalt' | 'lava'
export type TileFeature = 'watchtower' | 'spring' | 'rune'
export type Tile = { q: number; r: number; terrain: Terrain; feature?: TileFeature }
type Phase = 'move' | 'attack' | 'special' | 'charge' | 'over'

export type PawnPlacement = {
  readonly kind: Pawn['kind']
  readonly col: number
  readonly row: number
}

export type FixedBattleSetup = {
  readonly biome: Biome
  readonly map: readonly string[]
  readonly hellfireCount?: 1 | 2
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
  hellfire: Axial[]
  pawns: Pawn[]
  order: number[]
  active: number
  round: number
  phase: Phase
  chargeDestination: Axial | null
  winner: Side | 'draw' | null
  log: string[]
  logCount: number
}

export type BattleImpact = Axial & { damage: number }

export type BattleEffect = {
  kind: 'move' | 'attack' | 'rally' | 'fireball' | 'bomb' | 'escape' | 'protect' | 'hellfire'
  from: Axial
  to: Axial
  centers?: Axial[]
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
