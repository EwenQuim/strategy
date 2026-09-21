import type { Axial, Tile } from './types.ts'

export const MAP_WIDTH = 10
export const MAP_HEIGHT = 10

export const key = (q: number, r: number) => `${q},${r}`
export const hexOf = (col: number, row: number): Axial => ({ q: col - Math.floor(row / 2), r: row })

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

function makeTiles(): Map<string, Tile> {
  const tiles = new Map<string, Tile>()
  for (let row = 0; row < MAP_HEIGHT; row++) {
    for (let col = 0; col < MAP_WIDTH; col++) {
      const { q, r } = hexOf(col, row)
      const h = Math.abs((col * 73856093) ^ (row * 19349663)) % 100
      const terrain: Tile['terrain'] = h < 12 ? 'mountain' : h < 35 ? 'forest' : 'plain'
      tiles.set(key(q, r), { q, r, terrain })
    }
  }
  return tiles
}

export function makeMap(): Map<string, Tile> {
  return makeTiles()
}

export function reachable(
  tiles: Map<string, Tile>,
  occupied: Set<string>,
  start: Axial,
  maxSteps: number,
): Map<string, number> {
  const dist = new Map([[key(start.q, start.r), 0]])
  const frontier: Axial[] = [start]
  for (let step = 1; step <= maxSteps; step++) {
    const next: Axial[] = []
    for (const cur of frontier) {
      for (const n of neighbors(cur.q, cur.r)) {
        const k = key(n.q, n.r)
        const tile = tiles.get(k)
        if (!tile || tile.terrain === 'mountain' || occupied.has(k) || dist.has(k)) continue
        dist.set(k, step)
        next.push(n)
      }
    }
    frontier.push(...next)
  }
  return dist
}

export function distFrom(tiles: Map<string, Tile>, sources: Axial[]): Map<string, number> {
  const dist = new Map<string, number>()
  let frontier = sources.filter((s) => {
    const t = tiles.get(key(s.q, s.r))
    return t && t.terrain !== 'mountain'
  })
  for (const s of frontier) dist.set(key(s.q, s.r), 0)
  let step = 0
  while (frontier.length) {
    step++
    const next: Axial[] = []
    for (const cur of frontier) {
      for (const n of neighbors(cur.q, cur.r)) {
        const k = key(n.q, n.r)
        const tile = tiles.get(k)
        if (!tile || tile.terrain === 'mountain' || dist.has(k)) continue
        dist.set(k, step)
        next.push(n)
      }
    }
    frontier = next
  }
  return dist
}
