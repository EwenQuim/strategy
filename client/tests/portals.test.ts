import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  King,
  Swordsman,
  hexOf,
  key,
  mapFromRows,
  movementDestinations,
  passable,
  portalTwin,
  reducer,
  type GameState,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'

function field(pawns: Pawn[]): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++)
    for (let r = -5; r <= 5; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    seed: 'portals',
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

function portalField(): GameState {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, -2, 3, 'enemy'),
  ])
  state.tiles.set('1,0', { q: 1, r: 0, terrain: 'plain', feature: 'portal' })
  state.tiles.set('4,4', { q: 4, r: 4, terrain: 'plain', feature: 'portal' })
  return state
}

test('Portals are authored in pairs and map rows reject a lone gate', () => {
  const tiles = mapFromRows(['P.P'])
  const gates = [...tiles.values()].filter((tile) => tile.feature === 'portal')
  assert.equal(gates.length, 2)
  const [a, b] = gates.map((tile) => key(tile.q, tile.r))
  assert.equal(portalTwin(tiles, a), b)
  assert.equal(portalTwin(tiles, b), a)
  assert.equal(portalTwin(tiles, '9,9'), undefined)
  assert.throws(() => mapFromRows(['P..']), /Portals must be authored in pairs/)
  assert.throws(() => mapFromRows(['PPP']), /limited to two tiles/)
})

test('Portal tiles stay passable and walking into one continues on its twin', () => {
  const state = portalField()
  assert.ok(passable(state.tiles.get('1,0')))
  const reach = movementDestinations(state.tiles, state.pawns, state.pawns[0])
  assert.equal(reach.get('1,0'), 1)
  assert.equal(reach.get('4,4'), 2)
  const next = reducer(state, { type: 'move', q: 4, r: 4 })
  assert.equal(next.pawns[0].q, 4)
  assert.equal(next.pawns[0].r, 4)
  assert.equal(next.pawns[0].energy, 1)
  assert.equal(state.pawns[0].q, 0)
})

test('A blocked twin still lets units stand on the portal tile', () => {
  const state = portalField()
  state.pawns.push(new Swordsman(4, 4, 4, 'enemy'))
  const reach = movementDestinations(state.tiles, state.pawns, state.pawns[0])
  assert.equal(reach.has('4,4'), false)
  assert.equal(reach.get('1,0'), 1)
  assert.equal(reducer(state, { type: 'move', q: 4, r: 4 }), state)
})

test('A pawn standing on a portal steps out at its twin for a single step', () => {
  const state = portalField()
  state.pawns[0].q = 1
  state.pawns[0].energy = 1
  const next = reducer(state, { type: 'move', q: 4, r: 4 })
  assert.equal(next.pawns[0].q, 4)
  assert.equal(next.pawns[0].r, 4)
  assert.equal(next.pawns[0].energy, 0)
})

test('Portal twins are computed from authored map coordinates', () => {
  const rows = ['..P', '...', 'P..']
  const tiles = mapFromRows(rows)
  const gates = [...tiles.values()].filter((tile) => tile.feature === 'portal')
  const keys = gates.map((tile) => key(tile.q, tile.r)).sort()
  assert.deepEqual(
    keys,
    [key(hexOf(2, 0).q, hexOf(2, 0).r), key(hexOf(0, 2).q, hexOf(0, 2).r)].sort(),
  )
  assert.equal(portalTwin(tiles, keys[0]), keys[1])
})
