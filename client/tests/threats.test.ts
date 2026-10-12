import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Bulwark, Lancer, Ninja, Swordsman, threatenedTiles } from '../src/lib/engine/index.ts'
import { field } from './field.ts'

test('Charge threat requires a surviving walking route and energy reserved for the signature', () => {
  const state = field([new Swordsman(1, 0, 0, 'enemy')])
  const threats = threatenedTiles(state.tiles, state.pawns, 'enemy')
  assert.ok(threats.has('4,0'))
  assert.ok(!threats.has('5,0'))
  for (const tile of state.tiles.values()) {
    if (tile.q === 1) tile.terrain = 'mountain'
  }
  assert.ok(!threatenedTiles(state.tiles, state.pawns, 'enemy').has('3,0'))
  state.tiles = new Map([
    ['0,0', { q: 0, r: 0, terrain: 'plain' }],
    ['1,0', { q: 1, r: 0, terrain: 'lava' }],
    ['2,0', { q: 2, r: 0, terrain: 'plain' }],
    ['3,0', { q: 3, r: 0, terrain: 'plain' }],
  ])
  state.pawns[0].hp = 1
  assert.ok(!threatenedTiles(state.tiles, state.pawns, 'enemy').has('3,0'))
})

test('Ambush threat crosses absent tiles but excludes blocked or lethal landing ground', () => {
  const state = field([new Ninja(1, 0, 0, 'enemy')])
  state.tiles = new Map([
    ['0,0', { q: 0, r: 0, terrain: 'plain' }],
    ['3,0', { q: 3, r: 0, terrain: 'plain' }],
    ['4,0', { q: 4, r: 0, terrain: 'plain' }],
  ])
  assert.ok(threatenedTiles(state.tiles, state.pawns, 'enemy').has('4,0'))
  state.tiles.get('3,0')!.terrain = 'lava'
  assert.ok(!threatenedTiles(state.tiles, state.pawns, 'enemy').has('4,0'))
  state.tiles.get('3,0')!.terrain = 'plain'
  state.pawns.push(new Bulwark(2, 3, 0, 'enemy'))
  assert.ok(!threatenedTiles(state.tiles, state.pawns, 'enemy').has('4,0'))
})

test('Rush threat stops at units, gaps and impassable ground and requires a surviving landing', () => {
  const state = field([new Lancer(1, 0, 0, 'enemy', 1)])
  state.tiles = new Map(
    Array.from({ length: 6 }, (_, q) => [`${q},0`, { q, r: 0, terrain: 'plain' as const }]),
  )
  assert.deepEqual([...threatenedTiles(state.tiles, state.pawns, 'enemy')].sort(), [
    '2,0',
    '3,0',
    '4,0',
    '5,0',
  ])
  state.pawns.push(new Bulwark(2, 3, 0, 'player'))
  assert.deepEqual([...threatenedTiles(state.tiles, state.pawns, 'enemy')].sort(), [
    '2,0',
    '3,0',
  ])
  state.pawns.pop()
  state.tiles.get('2,0')!.terrain = 'lava'
  // It can hit a foe on lava from safe ground, but cannot sprint onto lava and strike beyond.
  assert.deepEqual([...threatenedTiles(state.tiles, state.pawns, 'enemy')], ['2,0'])
  state.tiles.get('2,0')!.terrain = 'mountain'
  assert.equal(threatenedTiles(state.tiles, state.pawns, 'enemy').size, 0)
  state.tiles.delete('2,0')
  assert.equal(threatenedTiles(state.tiles, state.pawns, 'enemy').size, 0)
})

test('Protect threatens no tiles and previews leave current activation state untouched', () => {
  const guard = new Bulwark(1, 0, 0, 'enemy')
  const state = field([guard])
  assert.equal(threatenedTiles(state.tiles, state.pawns, 'enemy').size, 0)
  const swordsman = new Swordsman(2, 0, 0, 'enemy', 3, 0)
  swordsman.specialUsed = true
  state.pawns = [swordsman]
  const before = structuredClone(state)
  assert.ok(threatenedTiles(state.tiles, state.pawns, 'enemy').has('4,0'))
  assert.deepEqual(structuredClone(state), before)
})
