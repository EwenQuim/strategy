import assert from 'node:assert/strict'
import { test } from 'node:test'
import { King, Ninja, reducer, type Side } from '../src/lib/engine/index.ts'
import { field } from './field.ts'

for (const side of ['player', 'enemy'] as const) {
  const other: Side = side === 'player' ? 'enemy' : 'player'
  const setup = () =>
    field([new Ninja(1, 0, 0, side), new King(2, 0, 1, side, 4), new King(3, 4, 0, other, 4)])

  test(`${side}: Ambush can land without attacking even beside an enemy`, () => {
    for (const destination of [
      { q: -2, r: 0 },
      { q: 3, r: 0 },
      { q: 0, r: 0 },
    ]) {
      const state = setup()
      const before = structuredClone(state)
      const action = { type: 'special', destination } as const
      const next = reducer(state, action)
      assert.notEqual(next, state)
      const ninja = next.pawns.find((pawn) => pawn.id === 1)!
      assert.equal(ninja.q, destination.q)
      assert.equal(ninja.r, destination.r)
      assert.equal(ninja.energy, 1)
      assert.equal(ninja.specialUsed, true)
      assert.equal(next.pawns.find((pawn) => pawn.id === 3)!.hp, 4)
      assert.equal(reducer(next, action), next)
      assert.deepEqual(structuredClone(state), before)
    }
  })

  test(`${side}: Ambush rejects explicit invalid targets without spending its signature`, () => {
    const state = setup()
    const before = structuredClone(state)
    for (const target of [
      { q: 99, r: 99 },
      { q: 2, r: 2 },
      { q: 0, r: 1 },
      { q: 0, r: 0 },
      { q: 4, r: 0 },
    ]) {
      assert.equal(
        reducer(state, { type: 'special', destination: { q: -2, r: 0 }, target }),
        state,
        JSON.stringify(target),
      )
    }
    assert.deepEqual(structuredClone(state), before)
  })

  test(`${side}: Ambush still strikes a chosen enemy adjacent to its landing`, () => {
    const state = setup()
    const next = reducer(state, {
      type: 'special',
      destination: { q: 3, r: 0 },
      target: { q: 4, r: 0 },
    })
    assert.equal(next.pawns.find((pawn) => pawn.id === 1)!.q, 3)
    assert.equal(next.pawns.find((pawn) => pawn.id === 3)!.hp, 1)
  })
}
