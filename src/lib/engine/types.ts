import type { Pawn, Side } from './pawns'

export type Axial = { q: number; r: number }
export type Terrain = 'plain' | 'forest' | 'mountain'
export type Tile = { q: number; r: number; terrain: Terrain }
export type Phase = 'move' | 'attack' | 'over'

export type GameState = {
  tiles: Map<string, Tile>
  pawns: Pawn[]
  order: number[]
  active: number
  phase: Phase
  winner: Side | null
  log: string[]
}

export type Action =
  | { type: 'move'; q: number; r: number }
  | { type: 'act'; action: 'attack' | 'defense' | 'special' }
  | { type: 'attackAt'; q: number; r: number }
  | { type: 'cancelAttack' }
  | { type: 'endTurn' }
  | { type: 'restart' }
