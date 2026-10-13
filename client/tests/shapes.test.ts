import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAP_HEIGHTS,
  MAX_MAP_WIDTH,
  MIN_MAP_WIDTH,
  MIN_ROW_SPAN,
  generateMapShape,
  initialState,
  key,
  mirrorAxial,
  neighbors,
  passable,
  rollMapSize,
  type MapSize,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'
import { SeededRandom, seedState } from '../src/lib/engine/random.ts'

const SIZES: MapSize[] = [
  { width: 6, height: 8 },
  { width: 6, height: 10 },
  { width: 7, height: 10 },
  { width: 8, height: 8 },
  { width: 10, height: 10 },
]

function chunkCount(tiles: Map<string, Tile>): number {
  const seen = new Set<string>()
  let chunks = 0
  for (const tile of tiles.values()) {
    if (seen.has(key(tile.q, tile.r))) continue
    chunks++
    const frontier = [tile]
    seen.add(key(tile.q, tile.r))
    while (frontier.length) {
      const cur = frontier.pop()!
      for (const n of neighbors(cur.q, cur.r)) {
        const k = key(n.q, n.r)
        if (tiles.has(k) && !seen.has(k)) {
          seen.add(k)
          frontier.push(tiles.get(k)!)
        }
      }
    }
  }
  return chunks
}

function rowSpans(tiles: Map<string, Tile>, size: MapSize): number[] {
  const counts = Array<number>(size.height).fill(0)
  for (const tile of tiles.values()) counts[tile.r]++
  return counts
}

test('Rolled map sizes stay within the supported bounds', () => {
  const heights = new Set<number>()
  for (let index = 0; index < 200; index++) {
    const size = rollMapSize(new SeededRandom(seedState('size-' + index)))
    assert.ok(size.width >= MIN_MAP_WIDTH && size.width <= MAX_MAP_WIDTH)
    assert.ok((MAP_HEIGHTS as readonly number[]).includes(size.height))
    assert.equal(size.height % 2, 0)
    heights.add(size.height)
  }
  assert.deepEqual(heights, new Set(MAP_HEIGHTS))
})

test('Generated shapes are one connected chunk with playable spawn rows', () => {
  for (const size of SIZES) {
    for (let index = 0; index < 100; index++) {
      const seed = 'shape-' + index
      for (const symmetric of [false, true]) {
        const tiles = generateMapShape(new SeededRandom(seedState(seed)), size, symmetric)
        assert.deepEqual(
          tiles,
          generateMapShape(new SeededRandom(seedState(seed)), size, symmetric),
          'same seed must rebuild the same shape',
        )
        assert.ok(tiles.size <= size.width * size.height)
        assert.equal(chunkCount(tiles), 1, size.width + 'x' + size.height + ': ' + seed)
        const spans = rowSpans(tiles, size)
        for (const [row, span] of spans.entries()) {
          if (row < 4 || row >= size.height - 4)
            assert.ok(
              span >= MIN_ROW_SPAN,
              'spawn row ' + row + ' carved to ' + span + ' tiles',
            )
        }
        if (symmetric)
          for (const tile of tiles.values()) {
            const mirror = mirrorAxial(tile, size)
            assert.ok(tiles.has(key(mirror.q, mirror.r)), seed + ' broke mirror symmetry')
          }
      }
    }
  }
})

test('Frontier carving reshapes most maps and interior gaps stay the exception', () => {
  // Interior gaps need rows between the spawn zones, so the sample uses a height-10 map.
  const size = { width: 8, height: 10 }
  let carved = 0
  let interior = 0
  const samples = 300
  for (let index = 0; index < samples; index++) {
    const tiles = generateMapShape(new SeededRandom(seedState('carve-' + index)), size)
    if (tiles.size < size.width * size.height) carved++
    // Interior gaps are absent tiles that frontier carving cannot reach.
    let gap = false
    for (let row = 4; row <= size.height - 5 && !gap; row++)
      for (let col = 2; col < size.width - 2 && !gap; col++)
        if (!tiles.has(key(col - Math.floor(row / 2), row))) gap = true
    if (gap) interior++
  }
  // P(carved) = 1 - 0.2 * 0.75 = 0.85; interior gaps only show up on non-border
  // columns, so roughly one map in five reveals one.
  assert.ok(carved > samples * 0.78 && carved < samples * 0.92, 'carved ' + carved)
  assert.ok(interior > samples * 0.08 && interior < samples * 0.35, 'interior ' + interior)
})

test('Maximal armies always find distinct passable spawn tiles', () => {
  const roster: Pawn['kind'][] = ['king', ...Array(23).fill('swordsman')]
  for (let index = 0; index < 30; index++) {
    const state = initialState('full-army-' + index, {
      biome: 'verdant',
      player: [...roster],
      enemy: [...roster],
    })
    const spots = new Set(state.pawns.map((pawn) => key(pawn.q, pawn.r)))
    assert.equal(spots.size, state.pawns.length)
    for (const pawn of state.pawns) assert.ok(passable(state.tiles.get(key(pawn.q, pawn.r))))
    const land = [...state.tiles.values()].filter(passable)
    const reachable = new Set([key(land[0].q, land[0].r)])
    const frontier = [land[0]]
    while (frontier.length) {
      const cur = frontier.pop()!
      for (const n of neighbors(cur.q, cur.r)) {
        const k = key(n.q, n.r)
        const tile = state.tiles.get(k)
        if (tile && passable(tile) && !reachable.has(k)) {
          reachable.add(k)
          frontier.push(tile)
        }
      }
    }
    for (const pawn of state.pawns) assert.ok(reachable.has(key(pawn.q, pawn.r)))
  }
})
