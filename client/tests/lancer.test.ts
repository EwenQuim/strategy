import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  King,
  Lancer,
  Swordsman,
  canAttack,
  reducer,
  targetingTiles,
  transition,
  type GameState,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'
import { dashDestinations } from '../src/lib/engine/pawns/lancer.ts'

function field(pawns: Pawn[]): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++)
    for (let r = -5; r <= 5; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    seed: 'lancer',
    biome: 'verdant',
    hellfire: [],
    randomState: 0,
    tiles,
    pawns,
    order: pawns.map((pawn) => pawn.id),
    active: 0,
    round: 1,
    lastClashRound: 0,
    blows: [],
    escapes: [],
    winner: null,
    log: [],
    logCount: 0,
  }
}

// Kings parked off every dash line so they never block the six rays.
const lancers = () => [
  new Lancer(1, 0, 0, 'player'),
  new King(2, 2, 3, 'player'),
  new King(3, -2, 3, 'enemy'),
]

test('The lancer strikes at distance one and two', () => {
  const lancer = new Lancer(1, 0, 0, 'player')
  assert.equal(lancer.maxHp, 3)
  assert.equal(lancer.attack.damage, 1)
  assert.ok(canAttack(lancer, new King(2, 2, 0, 'enemy')))
  assert.equal(canAttack(lancer, new King(2, 3, 0, 'enemy')), false)
})

test('Dash runs along the six straight lines until the map edge', () => {
  const state = field(lancers())
  const tiles = targetingTiles(state, { action: 'special' })
  assert.equal(tiles.size, 30)
  for (const k of ['1,0', '5,0', '-5,0', '0,5', '0,-5', '5,-5', '-5,5'])
    assert.ok(tiles.has(k), 'Missing dash destination ' + k)
  assert.equal(tiles.has('0,0'), false)
})

test('Dash lands on the chosen line tile for two energy and keeps the rest', () => {
  const state = field(lancers())
  const result = transition(state, { type: 'special', target: { q: 3, r: 0 } })
  assert.equal(result.state.pawns[0].q, 3)
  assert.equal(result.state.pawns[0].r, 0)
  assert.equal(result.state.pawns[0].energy, 1)
  assert.equal(result.frames[0].effect?.kind, 'move')
  assert.deepEqual(result.frames[0].effect?.to, { q: 3, r: 0 })
  assert.equal(state.pawns[0].q, 0)
})

test('Mountains and units cut the dash line short', () => {
  const blocked = field(lancers())
  blocked.tiles.get('2,0')!.terrain = 'mountain'
  assert.deepEqual(
    [...dashDestinations(blocked.tiles, blocked.pawns, blocked.pawns[0])]
      .filter((tile) => tile.r === 0 && tile.q > 0)
      .map((tile) => tile.q),
    [1],
  )
  assert.equal(reducer(blocked, { type: 'special', target: { q: 3, r: 0 } }), blocked)

  const garrisoned = field(lancers())
  garrisoned.pawns.push(new Swordsman(4, 2, 0, 'enemy'))
  assert.deepEqual(
    [...dashDestinations(garrisoned.tiles, garrisoned.pawns, garrisoned.pawns[0])]
      .filter((tile) => tile.r === 0 && tile.q > 0)
      .map((tile) => tile.q),
    [1],
  )
  assert.equal(reducer(garrisoned, { type: 'special', target: { q: 2, r: 0 } }), garrisoned)
})

test('A dash collects runes along its path', () => {
  const state = field(lancers())
  state.tiles.get('2,0')!.feature = 'rune'
  const next = reducer(state, { type: 'special', target: { q: 3, r: 0 } })
  assert.equal(next.pawns[0].energy, 3)
  assert.equal(next.tiles.get('2,0')!.feature, undefined)
  assert.equal(state.tiles.get('2,0')!.feature, 'rune')
})

test('Dash needs two energy and refuses tiles off every line', () => {
  const state = field(lancers())
  state.pawns[0].energy = 1
  assert.equal(targetingTiles(state, { action: 'special' }).size, 0)
  assert.equal(reducer(state, { type: 'special', target: { q: 3, r: 0 } }), state)
  state.pawns[0].energy = 3
  assert.equal(reducer(state, { type: 'special', target: { q: 2, r: 1 } }), state)
})
