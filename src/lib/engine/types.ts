import type { Pawn, Side } from './pawns.ts'

export type Axial = { q: number; r: number }
export type Terrain = 'plain' | 'forest' | 'mountain'
export type Tile = { q: number; r: number; terrain: Terrain }
export type Phase = 'move' | 'attack' | 'special' | 'charge' | 'over'

export type GameState = {
  seed: string
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

export type Action =
  | { type: 'move'; q: number; r: number }
  | { type: 'act'; action: 'attack' | 'escape' | 'special' }
  | { type: 'attackAt'; q: number; r: number }
  | { type: 'specialAt'; q: number; r: number }
  | { type: 'cancelTargeting' }
  | { type: 'endTurn' }
  | { type: 'restart' }
