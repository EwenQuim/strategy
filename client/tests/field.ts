import { initialState, type GameState, type Pawn } from '../src/lib/engine/index.ts'

export function field(pawns: Pawn[]): GameState {
  const state = initialState('signature-engine')
  state.tiles = new Map()
  for (let q = -4; q <= 5; q++)
    for (let r = -4; r <= 5; r++) state.tiles.set(`${q},${r}`, { q, r, terrain: 'plain' })
  return { ...state, pawns, order: pawns.map((p) => p.id), active: 0, hazards: [] }
}
