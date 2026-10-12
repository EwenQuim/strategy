import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Bulwark,
  King,
  Swordsman,
  Ninja,
  reducer,
  protectorFor,
  movementDestinations,
} from '../src/lib/engine/index.ts'
import { field } from './field.ts'

test('Mobile protection costs one energy and follows the ally until the next activation', () => {
  const state = field([
    new Bulwark(1, 0, 0, 'player'),
    new Ninja(2, 1, 0, 'player'),
    new King(3, 0, 1, 'player'),
    new King(4, 4, 0, 'enemy'),
    new Swordsman(5, 1, 1, 'enemy'),
  ])
  assert.equal(movementDestinations(state.tiles, state.pawns, state.pawns[0]).get('-1,0'), 1)
  const guarded = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(guarded.pawns[0].energy, 2)
  assert.equal(protectorFor(guarded.pawns, guarded.pawns[1])?.id, 1)
  const moved = reducer(guarded, { type: 'move', q: -2, r: 0 })
  assert.equal(moved.pawns[0].q, -2)
  const attackState = { ...moved, active: 4, order: [1, 2, 3, 4, 5] }
  const hit = reducer(attackState, {
    type: 'special',
    destination: { q: 1, r: 1 },
    target: { q: 1, r: 0 },
  })
  assert.equal(hit.pawns[0].hp, 8)
  assert.equal(hit.pawns[1].hp, 1)
  assert.equal(hit.pawns[0].protectingId, null)
})
