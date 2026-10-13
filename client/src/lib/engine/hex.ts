export type Axial = { q: number; r: number }
export type Terrain =
  'plain' | 'forest' | 'mountain' | 'lake' | 'sand' | 'palm' | 'basalt' | 'lava'
export type TileFeature = 'watchtower' | 'spring' | 'rune'
export type Tile = { q: number; r: number; terrain: Terrain; feature?: TileFeature }

export const MAP_WIDTH = 8
export const MAP_HEIGHT = 12

// Generated maps roll their dimensions; authored maps derive them from their rows.
export type MapSize = { readonly width: number; readonly height: number }
export const DEFAULT_MAP_SIZE: MapSize = { width: MAP_WIDTH, height: MAP_HEIGHT }

export const key = (q: number, r: number) => `${q},${r}`
export const hexOf = (col: number, row: number): Axial => ({
  q: col - Math.floor(row / 2),
  r: row,
})

const NEIGHBORS: Axial[] = [
  { q: 1, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 1 },
]

export function neighbors(q: number, r: number): Axial[] {
  return NEIGHBORS.map(({ q: dq, r: dr }) => ({ q: q + dq, r: r + dr }))
}

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

export function hexDist(a: Axial, b: Axial) {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2
}

export const sameHex = (a: Axial | null | undefined, b: Axial | null | undefined): boolean =>
  !!a && !!b && a.q === b.q && a.r === b.r

export function mirrorAxial({ q, r }: Axial, size: MapSize): Axial {
  return { q: size.width - q - size.height / 2, r: size.height - 1 - r }
}

export function passable(tile: Tile | undefined): boolean {
  return !!tile && tile.terrain !== 'mountain' && tile.terrain !== 'lake'
}

const terrainSymbols: Record<string, Terrain> = {
  '.': 'plain',
  f: 'forest',
  '^': 'mountain',
  '~': 'lake',
  s: 'sand',
  p: 'palm',
  b: 'basalt',
  l: 'lava',
}

const featureSymbols: Record<string, TileFeature> = { W: 'watchtower', H: 'spring', R: 'rune' }

export function mapFromRows(rows: readonly string[]): Map<string, Tile> {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Map must contain at least one row')
  const tiles = new Map<string, Tile>()
  for (let row = 0; row < rows.length; row++) {
    const line = rows[row]
    if (typeof line !== 'string') throw new Error('Map row ' + row + ' must be a string')
    for (let col = 0; col < line.length; col++) {
      const symbol = line[col]
      if (symbol === '_') continue
      const feature = Object.hasOwn(featureSymbols, symbol) ? featureSymbols[symbol] : undefined
      if (!feature && !Object.hasOwn(terrainSymbols, symbol))
        throw new Error('Unknown map terrain: ' + symbol)
      const { q, r } = hexOf(col, row)
      tiles.set(key(q, r), {
        q,
        r,
        terrain: feature ? 'plain' : terrainSymbols[symbol],
        ...(feature ? { feature } : {}),
      })
    }
  }
  if (!tiles.size) throw new Error('Map must contain at least one tile')
  const features = [...tiles.values()].filter((tile) => tile.feature)
  if (features.length > 2) throw new Error('Map features must be limited to two tiles')
  return tiles
}

export function distFrom(tiles: Map<string, Tile>, sources: Axial[]): Map<string, number> {
  const dist = new Map<string, number>()
  let frontier = sources.filter((s) => passable(tiles.get(key(s.q, s.r))))
  for (const s of frontier) dist.set(key(s.q, s.r), 0)
  let step = 0
  while (frontier.length) {
    step++
    const next: Axial[] = []
    for (const cur of frontier) {
      for (const n of neighbors(cur.q, cur.r)) {
        const k = key(n.q, n.r)
        const tile = tiles.get(k)
        if (!passable(tile) || dist.has(k)) continue
        dist.set(k, step)
        next.push(n)
      }
    }
    frontier = next
  }
  return dist
}
