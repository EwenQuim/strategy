import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Archer,
  King,
  Lancer,
  Swordsman,
  initialState,
  type GameState,
} from '../src/lib/engine/index.ts'
import { estimateIncomingDamage, type ReachCache } from '../src/lib/engine/ai/evaluate.ts'

function corridor(): GameState {
  const state = initialState('reach-cache')
  state.tiles = new Map()
  for (let q = -8; q <= 8; q++) state.tiles.set(`${q},0`, { q, r: 0, terrain: 'plain' })
  state.pawns = [
    new Archer(1, 0, 0, 'enemy'),
    new King(2, 4, 0, 'player'),
    new Swordsman(3, -6, 0, 'player'),
    new King(4, -8, 0, 'enemy'),
  ]
  state.order = [1, 2, 3, 4]
  state.active = 0
  state.hazards = []
  return state
}

test('Incoming shots respect movement blockers after irrelevant movement and health changes', () => {
  const state = corridor()
  const cache: ReachCache = new Map()
  assert.equal(estimateIncomingDamage(state, 'player', cache).get(2), 2)
  const changed = { ...state, pawns: state.pawns.map((pawn) => pawn.clone()) }
  changed.pawns[2].q = -5
  changed.pawns[2].hp--
  assert.equal(estimateIncomingDamage(changed, 'player', cache).get(2), 2)
  const blocked = { ...changed, pawns: changed.pawns.map((pawn) => pawn.clone()) }
  blocked.pawns[2].q = 1
  assert.equal(estimateIncomingDamage(blocked, 'player', cache).get(2), 0)
  assert.equal(estimateIncomingDamage(state, 'player', cache).get(2), 2)
})

test('Runes extend incoming reach and collecting the rune restores the ordinary bound', () => {
  const state = corridor()
  state.pawns[1].q = 6
  const cache: ReachCache = new Map()
  assert.equal(estimateIncomingDamage(state, 'player', cache).get(2), 0)
  const empowered = { ...state, tiles: new Map(state.tiles) }
  empowered.tiles.set('1,0', { q: 1, r: 0, terrain: 'plain', feature: 'rune' })
  assert.equal(estimateIncomingDamage(empowered, 'player', cache).get(2), 2)
  assert.equal(estimateIncomingDamage(state, 'player', cache).get(2), 0)
})

test('Long-range Rush threats are retained and no attacker threatens a target acting first', () => {
  const state = corridor()
  state.pawns[0] = new Lancer(1, 0, 0, 'enemy')
  state.pawns[1].q = 8
  assert.equal(estimateIncomingDamage(state, 'player', new Map()).get(2), 2)
  assert.equal(
    estimateIncomingDamage({ ...state, order: [2, 1, 3, 4] }, 'player', new Map()).get(2),
    0,
  )
})
