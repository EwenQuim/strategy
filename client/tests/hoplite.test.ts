import assert from 'node:assert/strict'
import { test } from 'node:test'
import { King, neighbors, reducer, type Side } from '../src/lib/engine/index.ts'
import { Hoplite } from '../src/lib/engine/pawns/hoplite.ts'
import { field } from './field.ts'

test('Thrust strikes bent distance-two targets without pushing them, for either side', () => {
  for (const side of ['player', 'enemy'] as const) {
    const foe: Side = side === 'player' ? 'enemy' : 'player'
    for (const [q, r] of [
      [2, -1],
      [1, -2],
      [-2, 1],
      [-1, 2],
      [1, 1],
      [-1, -1],
    ]) {
      const state = field([new Hoplite(1, 0, 0, side), new King(2, q, r, foe)])
      const next = reducer(state, { type: 'special', target: { q, r } })
      assert.equal(next.pawns[1].hp, 6)
      assert.equal(next.pawns[1].q, q)
      assert.equal(next.pawns[1].r, r)
      assert.equal(state.pawns[1].hp, 7)
    }
  }
})

test('Thrust pushes one tile directly away on all six hex lines at both distances', () => {
  for (const direction of neighbors(0, 0)) {
    for (const distance of [1, 2]) {
      const q = direction.q * distance
      const r = direction.r * distance
      const state = field([new Hoplite(1, 0, 0, 'player'), new King(2, q, r, 'enemy')])
      const next = reducer(state, { type: 'special', target: { q, r } })
      assert.equal(next.pawns[1].hp, 6)
      assert.equal(next.pawns[1].q, q + direction.q)
      assert.equal(next.pawns[1].r, r + direction.r)
    }
  }
})
