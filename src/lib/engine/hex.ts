import type { SeededRandom } from './random.ts'
import type { Axial, Biome, Terrain, Tile } from './types.ts'

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

export function passable(tile: Tile | undefined): boolean {
  return !!tile && tile.terrain !== 'mountain' && tile.terrain !== 'lake'
}

type Shape = [number, number][]

type MapFeature = {
  terrain: Terrain
  min: number
  max: number
  shapes: Shape[]
}

const roll = (min: number, max: number, random: SeededRandom) =>
  min + Math.floor(random.next() * (max - min + 1))

const lineShape = (length: number): Shape =>
  Array.from({ length }, (_, i) => [i, 0] as [number, number])

const bendShape = (first: number, second: number): Shape => [
  ...lineShape(first),
  ...lineShape(second - 1).map(([q]) => [first - 1, q + 1] as [number, number]),
]

export const BIOMES: Record<Biome, { name: string; feature: MapFeature | null }> = {
  verdant: {
    name: 'Verdant Vale',
    feature: {
      terrain: 'lake',
      min: 3,
      max: 6,
      shapes: [
        [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, -1],
        ],
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, -1],
          [-1, 1],
        ],
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, -1],
          [-1, 1],
          [-1, 2],
        ],
      ],
    },
  },
  mountains: {
    name: 'Mountain Ranges',
    feature: {
      terrain: 'mountain',
      min: 3,
      max: 5,
      shapes: [
        ...[4, 5, 6, 7].map(lineShape),
        ...[2, 3].flatMap((first) => [3, 4].map((second) => bendShape(first, second))),
      ],
    },
  },
  desert: { name: 'Open Desert', feature: null },
}

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

function placeFeature(
  tiles: Map<string, Tile>,
  anchors: Tile[],
  reserved: Set<string>,
  feature: MapFeature,
  random: SeededRandom,
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
        if (!shapeFits(tiles, reserved, anchor, shape, feature.terrain)) continue
        const placedTiles = shape.map(([q, r]) => tiles.get(key(anchor.q + q, anchor.r + r))!)
        const previous = placedTiles.map((tile) => tile.terrain)
        for (const tile of placedTiles) tile.terrain = feature.terrain
        const land = anchors.filter(passable)
        if (distFrom(tiles, land.slice(0, 1)).size !== land.length) {
          placedTiles.forEach((tile, index) => {
            tile.terrain = previous[index]
          })
          continue
        }
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
}

export function mapFromRows(rows: readonly string[]): Map<string, Tile> {
  if (!Array.isArray(rows) || rows.length !== MAP_HEIGHT)
    throw new Error('Map must contain ' + MAP_HEIGHT + ' rows')
  const tiles = new Map<string, Tile>()
  for (let row = 0; row < MAP_HEIGHT; row++) {
    const line = rows[row]
    if (typeof line !== 'string' || line.length !== MAP_WIDTH)
      throw new Error('Map row ' + row + ' must contain ' + MAP_WIDTH + ' tiles')
    for (let col = 0; col < MAP_WIDTH; col++) {
      const symbol = line[col]
      if (!Object.hasOwn(terrainSymbols, symbol))
        throw new Error('Unknown map terrain: ' + symbol)
      const { q, r } = hexOf(col, row)
      tiles.set(key(q, r), { q, r, terrain: terrainSymbols[symbol] })
    }
  }
  return tiles
}

export function makeMap(
  random: SeededRandom,
  biome: Biome,
  protectedTiles: Axial[] = [],
): Map<string, Tile> {
  const tiles = new Map<string, Tile>()
  const reserved = new Set(protectedTiles.map((p) => key(p.q, p.r)))
  for (let row = 0; row < MAP_HEIGHT; row++) {
    for (let col = 0; col < MAP_WIDTH; col++) {
      const { q, r } = hexOf(col, row)
      const terrain: Terrain =
        biome === 'desert'
          ? 'sand'
          : biome === 'verdant' && !reserved.has(key(q, r)) && random.next() < 0.25
            ? 'forest'
            : 'plain'
      tiles.set(key(q, r), { q, r, terrain })
    }
  }
  const feature = BIOMES[biome].feature
  if (feature) placeFeature(tiles, [...tiles.values()], reserved, feature, random)
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
