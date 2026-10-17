import { key, type Tile } from './hex.ts'

const NEIGHBOR_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
]

const neighborKeyGrids = new WeakMap<Map<string, Tile>, Map<string, string[]>>()

// Tiles maps are shared between states, so the grid is built once per map.
export function neighborKeys(tiles: Map<string, Tile>): Map<string, string[]> {
  let grid = neighborKeyGrids.get(tiles)
  if (!grid) {
    grid = new Map()
    for (const tile of tiles.values())
      grid.set(
        key(tile.q, tile.r),
        NEIGHBOR_OFFSETS.map(([dq, dr]) => key(tile.q + dq, tile.r + dr)),
      )
    neighborKeyGrids.set(tiles, grid)
  }
  return grid
}
