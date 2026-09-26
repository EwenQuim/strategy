import type { SeededRandom } from './random.ts'
import { BIOMES, type Biome } from './biomes/index.ts'
import type { MapFeature, Shape } from './biomes/biome.ts'

export type Axial = { q: number; r: number }
export type Terrain =
  'plain' | 'forest' | 'mountain' | 'lake' | 'sand' | 'palm' | 'basalt' | 'lava'
export type TileFeature = 'watchtower' | 'spring' | 'rune'
export type Tile = { q: number; r: number; terrain: Terrain; feature?: TileFeature }

export const MAP_WIDTH = 8
export const MAP_HEIGHT = 12

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

export function hexDist(a: Axial, b: Axial) {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2
}

export function mirrorAxial({ q, r }: Axial): Axial {
  return { q: MAP_WIDTH - q - MAP_HEIGHT / 2, r: MAP_HEIGHT - 1 - r }
}

export function passable(tile: Tile | undefined): boolean {
  return !!tile && tile.terrain !== 'mountain' && tile.terrain !== 'lake'
}

const roll = (min: number, max: number, random: SeededRandom) =>
  min + Math.floor(random.next() * (max - min + 1))

export const TILE_FEATURES: readonly TileFeature[] = ['watchtower', 'spring', 'rune']

function orient(shape: Shape, random: SeededRandom): Shape {
  const rotations = Math.floor(random.next() * 6)
  const flip = random.next() < 0.5
  return shape.map(([q, r]) => {
    if (flip) [q, r] = [r, q]
    for (let i = 0; i < rotations; i++) [q, r] = [-r, q + r]
    return [q, r]
  })
}

function shapeFits(
  tiles: Map<string, Tile>,
  reserved: Set<string>,
  anchor: Axial,
  shape: Shape,
  terrain: Terrain,
) {
  return shape.every(([q, r]) => {
    const k = key(anchor.q + q, anchor.r + r)
    const tile = tiles.get(k)
    if (!passable(tile) || reserved.has(k)) return false
    return neighbors(anchor.q + q, anchor.r + r).every((n) => {
      const nt = tiles.get(key(n.q, n.r))
      return !nt || nt.terrain !== terrain
    })
  })
}

function tryPlaceConnectedTerrain(
  tiles: Map<string, Tile>,
  allTiles: Tile[],
  featureTiles: Tile[],
  terrain: Terrain,
): boolean {
  const previousTerrain = featureTiles.map((tile) => tile.terrain)
  for (const tile of featureTiles) tile.terrain = terrain
  const land = allTiles.filter(passable)
  if (distFrom(tiles, land.slice(0, 1)).size === land.length) return true
  featureTiles.forEach((tile, index) => {
    tile.terrain = previousTerrain[index]
  })
  return false
}

type Placement = { anchor: Axial; shape: Shape }

const placementCells = ({ anchor, shape }: Placement): Axial[] =>
  shape.map(([q, r]) => ({ q: anchor.q + q, r: anchor.r + r }))

function placementsTouch(a: Placement, b: Placement): boolean {
  const aKeys = new Set(placementCells(a).map((cell) => key(cell.q, cell.r)))
  const bKeys = new Set(placementCells(b).map((cell) => key(cell.q, cell.r)))
  return placementCells(a).some(
    (cell) =>
      bKeys.has(key(cell.q, cell.r)) ||
      neighbors(cell.q, cell.r).some((n) => {
        const k = key(n.q, n.r)
        return bKeys.has(k) && !aKeys.has(k)
      }),
  )
}

function placeFeature(
  tiles: Map<string, Tile>,
  anchors: Tile[],
  reserved: Set<string>,
  feature: MapFeature,
  random: SeededRandom,
  symmetric = false,
) {
  const count = roll(feature.min, feature.max, random)
  for (let i = 0; i < count; i++) {
    const first = Math.floor(random.next() * feature.shapes.length)
    let placed = false
    for (let s = 0; s < feature.shapes.length && !placed; s++) {
      const shape = orient(feature.shapes[(first + s) % feature.shapes.length], random)
      const offset = Math.floor(random.next() * anchors.length)
      for (let a = 0; a < anchors.length; a++) {
        const anchor = anchors[(offset + a) % anchors.length]
        const placements: Placement[] = symmetric
          ? [
              { anchor, shape },
              {
                anchor: mirrorAxial(anchor),
                shape: shape.map(([q, r]) => [-q, -r] as [number, number]),
              },
            ]
          : [{ anchor, shape }]
        if (
          !placements.every((p) =>
            shapeFits(tiles, reserved, p.anchor, p.shape, feature.terrain),
          )
        )
          continue
        if (symmetric && placementsTouch(placements[0], placements[1])) continue
        const placedTiles = placements.flatMap((p) =>
          placementCells(p).map((cell) => tiles.get(key(cell.q, cell.r))!),
        )
        if (!tryPlaceConnectedTerrain(tiles, anchors, placedTiles, feature.terrain)) continue
        for (const tile of placedTiles) reserved.add(key(tile.q, tile.r))
        placed = true
        break
      }
    }
  }
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

export function makeMap(
  random: SeededRandom,
  biome: Biome,
  protectedTiles: Axial[] = [],
  symmetric = false,
): Map<string, Tile> {
  const { ground, scatter, features: terrainFeatures } = BIOMES[biome]
  const tiles = new Map<string, Tile>()
  const reserved = new Set(protectedTiles.map((p) => key(p.q, p.r)))
  if (symmetric)
    for (const p of protectedTiles) {
      const mirror = mirrorAxial(p)
      reserved.add(key(mirror.q, mirror.r))
    }
  const rows = symmetric ? MAP_HEIGHT / 2 : MAP_HEIGHT
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < MAP_WIDTH; col++) {
      const { q, r } = hexOf(col, row)
      const pair: Axial[] = symmetric ? [{ q, r }, mirrorAxial({ q, r })] : [{ q, r }]
      const blocked = pair.some((t) => reserved.has(key(t.q, t.r)))
      const terrain =
        scatter && !blocked && random.next() < scatter.chance ? scatter.terrain : ground
      for (const t of pair) tiles.set(key(t.q, t.r), { q: t.q, r: t.r, terrain })
    }
  }
  for (const feature of terrainFeatures)
    placeFeature(tiles, [...tiles.values()], reserved, feature, random, symmetric)
  const roll = random.next()
  const count = roll < 0.5 ? 0 : roll < 0.9 ? 1 : 2
  const candidates = [...tiles.values()].filter(
    (tile) =>
      (tile.r === MAP_HEIGHT / 2 - 1 || tile.r === MAP_HEIGHT / 2) &&
      passable(tile) &&
      tile.terrain !== 'lava' &&
      !reserved.has(key(tile.q, tile.r)),
  )
  const features = [...TILE_FEATURES]
  for (let i = 0; i < count && candidates.length; i++) {
    const [tile] = candidates.splice(Math.floor(random.next() * candidates.length), 1)
    const [feature] = features.splice(Math.floor(random.next() * features.length), 1)
    tile.feature = feature
    if (symmetric) {
      const mirror = mirrorAxial(tile)
      const mirrorTile = tiles.get(key(mirror.q, mirror.r))!
      mirrorTile.feature = feature
      candidates.splice(candidates.indexOf(mirrorTile), 1)
    }
  }
  return tiles
}

export function reachable(
  tiles: Map<string, Tile>,
  occupied: Set<string>,
  start: Axial,
  maxSteps: number,
): Map<string, number> {
  const dist = new Map([[key(start.q, start.r), 0]])
  let frontier: Axial[] = [start]
  for (let step = 1; step <= maxSteps; step++) {
    const next: Axial[] = []
    for (const cur of frontier) {
      for (const n of neighbors(cur.q, cur.r)) {
        const k = key(n.q, n.r)
        const tile = tiles.get(k)
        if (!passable(tile) || occupied.has(k) || dist.has(k)) continue
        dist.set(k, step)
        next.push(n)
      }
    }
    frontier = next
  }
  return dist
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
