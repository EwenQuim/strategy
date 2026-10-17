import {
  decorateMap,
  hexOf,
  key,
  mirrorAxial,
  neighbors,
  type Axial,
  type MapSize,
  type Tile,
} from './hex.ts'
import type { Biome } from './biomes/index.ts'
import type { SeededRandom } from './random.ts'

export const MIN_MAP_WIDTH = 6
export const MAX_MAP_WIDTH = 8
export const MAP_HEIGHTS = [8] as const

// Frontier carving reshapes most map outlines; interior gaps stay rare because
// mountains and lakes already break up the middle of the battlefield.
const FRONTIER_CARVE_CHANCE = 0.8
const INTERIOR_CARVE_CHANCE = 0.25
const MAX_INTERIOR_CARVES = 3
// Spawn zones can grow to four rows for maximal armies, so carving never cuts a
// row below this span and interior gaps only open between the zones.
export const MIN_ROW_SPAN = 6

export function rollMapSize(random: SeededRandom): MapSize {
  const width = MIN_MAP_WIDTH + Math.floor(random.next() * (MAX_MAP_WIDTH - MIN_MAP_WIDTH + 1))
  const height = MAP_HEIGHTS[Math.floor(random.next() * MAP_HEIGHTS.length)]
  return { width, height }
}

export function makeMap(
  random: SeededRandom,
  biome: Biome,
  protectedTiles: readonly Axial[] = [],
  symmetric = false,
  size: MapSize = rollMapSize(random),
): Map<string, Tile> {
  const shape = generateMapShape(random, size, symmetric, protectedTiles)
  return decorateMap(random, biome, shape, protectedTiles, symmetric, size)
}

function oneChunk(kept: ReadonlySet<string>): boolean {
  const start = kept.values().next().value
  if (start === undefined) return true
  const seen = new Set([start])
  const frontier = [start as string]
  while (frontier.length) {
    const [q, r] = frontier.pop()!.split(',').map(Number)
    for (const n of neighbors(q, r)) {
      const k = key(n.q, n.r)
      if (kept.has(k) && !seen.has(k)) {
        seen.add(k)
        frontier.push(k)
      }
    }
  }
  return seen.size === kept.size
}

// Builds the tile outline of a battle: a rolled rectangle whose frontier is
// carved most of the time, with rare interior gaps. Every removal is reverted
// if it would split the map, so the shape is always one connected chunk.
export function generateMapShape(
  random: SeededRandom,
  size: MapSize,
  symmetric = false,
  protectedTiles: readonly Axial[] = [],
): Map<string, Tile> {
  const reserved = new Set(protectedTiles.map((p) => key(p.q, p.r)))
  if (symmetric)
    for (const p of protectedTiles) {
      const mirror = mirrorAxial(p, size)
      reserved.add(key(mirror.q, mirror.r))
    }
  const kept = new Set<string>()
  for (let row = 0; row < size.height; row++)
    for (let col = 0; col < size.width; col++) kept.add(key(hexOf(col, row).q, row))
  const free = (k: string) => kept.has(k) && !reserved.has(k)
  // Symmetric maps remove mirror pairs atomically so a reverted safety check
  // can never leave one half carved.
  const carve = (q: number, r: number) => {
    const k = key(q, r)
    if (!free(k)) return
    kept.delete(k)
    if (!symmetric) {
      if (!oneChunk(kept)) kept.add(k)
      return
    }
    const mirror = mirrorAxial({ q, r }, size)
    const mirrorKey = key(mirror.q, mirror.r)
    if (mirrorKey !== k) kept.delete(mirrorKey)
    if (!oneChunk(kept)) {
      kept.add(k)
      if (mirrorKey !== k) kept.add(mirrorKey)
    }
  }
  if (random.next() < FRONTIER_CARVE_CHANCE) carveFrontier(random, size, symmetric, carve)
  if (random.next() < INTERIOR_CARVE_CHANCE)
    carveInterior(random, size, symmetric, reserved, kept, carve)
  const tiles = new Map<string, Tile>()
  for (const k of kept) {
    const [q, r] = k.split(',').map(Number)
    tiles.set(k, { q, r, terrain: 'plain' })
  }
  return tiles
}

function carveFrontier(
  random: SeededRandom,
  size: MapSize,
  symmetric: boolean,
  carve: (q: number, r: number) => void,
) {
  // Narrow maps stay rectangular: carving below the minimum row span would
  // shrink spawn zones below the maximal army size.
  const maxDepth = Math.max(0, Math.floor((size.width - MIN_ROW_SPAN) / 2))
  const rawLeft: number[] = []
  const rawRight: number[] = []
  for (let row = 0; row < size.height; row++) {
    rawLeft.push(random.next())
    if (!symmetric) rawRight.push(random.next())
  }
  const depth = (values: number[], row: number) => {
    const smooth =
      (values[Math.max(0, row - 1)] +
        2 * values[row] +
        values[Math.min(values.length - 1, row + 1)]) /
      4
    return Math.min(maxDepth, Math.round(smooth * maxDepth))
  }
  for (let row = 0; row < size.height; row++) {
    const left = depth(rawLeft, row)
    // The 180° mirror maps column c to width - 1 - c, so symmetric maps only
    // carve the left depths and let the pair-aware carve open the right side.
    const right = symmetric ? 0 : depth(rawRight, row)
    for (let d = 0; d < left; d++) carve(hexOf(d, row).q, row)
    for (let d = 0; d < right; d++) carve(hexOf(size.width - 1 - d, row).q, row)
  }
}

function carveInterior(
  random: SeededRandom,
  size: MapSize,
  symmetric: boolean,
  reserved: ReadonlySet<string>,
  kept: ReadonlySet<string>,
  carve: (q: number, r: number) => void,
) {
  const count = 1 + Math.floor(random.next() * MAX_INTERIOR_CARVES)
  const candidates: Axial[] = []
  for (let row = 4; row <= size.height - 5; row++)
    for (let col = 0; col < size.width; col++) {
      const { q } = hexOf(col, row)
      if (kept.has(key(q, row)) && !reserved.has(key(q, row))) candidates.push({ q, r: row })
    }
  for (let i = 0; i < count && candidates.length; i++) {
    const index = Math.floor(random.next() * candidates.length)
    const [tile] = candidates.splice(index, 1)
    carve(tile.q, tile.r)
    if (symmetric) {
      // The pair-aware carve removes the mirror tile with its partner.
      const mirror = mirrorAxial(tile, size)
      const mirrorIndex = candidates.findIndex((c) => c.q === mirror.q && c.r === mirror.r)
      if (mirrorIndex >= 0) candidates.splice(mirrorIndex, 1)
    }
  }
}
