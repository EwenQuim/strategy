import assert from 'node:assert/strict'
import { test } from 'node:test'
import { King, Swordsman, transition, reducer, type Side } from '../src/lib/engine/index.ts'
import { Wolf } from '../src/lib/engine/pawns/wolf.ts'
import { playbackReducer, frameDelay } from '../src/lib/playback.ts'
import { field } from './field.ts'

for (const side of ['player', 'enemy'] as const) {
  const foe: Side = side === 'player' ? 'enemy' : 'player'
  test(
    side + ': Rallying Blow heals every wounded adjacent ally, never itself or distant units',
    () => {
      const state = field([
        new King(1, 0, 0, side, 4),
        new Swordsman(2, 0, 1, side, 2),
        new Swordsman(3, -1, 0, side, 4),
        new Swordsman(4, 0, -1, side),
        new Swordsman(5, 2, 0, side, 2),
        new King(6, 1, 0, foe),
        new Swordsman(7, 1, -1, foe, 2),
      ])
      const before = structuredClone(state)
      const result = transition(state, { type: 'special', target: { q: 1, r: 0 } })
      assert.deepEqual(
        result.state.pawns.map((p) => p.hp),
        [4, 3, 5, 5, 2, 5, 2],
      )
      assert.deepEqual(result.frames[0].effect?.support, {
        kind: 'heal',
        recipients: [
          { q: 0, r: 1 },
          { q: -1, r: 0 },
        ],
      })
      assert.deepEqual(structuredClone(state), before)
      assert.deepEqual(transition(state, { type: 'special', target: { q: 1, r: 0 } }), result)
    },
  )

  test(
    side +
      ': Pack Hunt gives all adjacent allies energy, including exhausted and used-ability allies',
    () => {
      const state = field([
        new Wolf(1, 0, 0, side),
        new King(2, 0, 1, side),
        new Swordsman(3, -1, 0, side, undefined, 0),
        new Swordsman(4, 0, -1, side, undefined, 1),
        new Swordsman(5, 2, 0, side),
        new King(6, 1, 0, foe),
      ])
      state.pawns[3].specialUsed = true
      const before = structuredClone(state)
      const result = transition(state, { type: 'special', target: { q: 1, r: 0 } })
      assert.deepEqual(
        result.state.pawns.map((p) => p.energy),
        [1, 4, 1, 2, 3, 3],
      )
      assert.deepEqual(
        result.state.pawns.map((p) => p.bonusEnergy),
        [0, 1, 1, 1, 0, 0],
      )
      assert.equal(result.state.pawns[3].specialUsed, true)
      assert.deepEqual(result.frames[0].effect?.support, {
        kind: 'energy',
        recipients: [
          { q: 0, r: 1 },
          { q: -1, r: 0 },
          { q: 0, r: -1 },
        ],
      })
      assert.deepEqual(structuredClone(state), before)
      let next = result.state
      for (let i = 0; i < state.order.length; i++) next = reducer(next, { type: 'endTurn' })
      assert.equal(next.round, state.round + 1)
      assert.ok(
        next.pawns.every((p) => p.energy === 3 && p.bonusEnergy === 0 && !p.specialUsed),
      )
    },
  )
}

test('Healing more than the strike damage still counts as combat, rather than a stalemate', () => {
  const state = field([
    new King(1, 0, 0, 'player'),
    new Swordsman(2, 0, 1, 'player', 2),
    new Swordsman(3, -1, 0, 'player', 2),
    new Swordsman(4, 0, -1, 'player', 2),
    new King(5, 1, 0, 'enemy'),
  ])
  state.round = 5
  state.lastClashRound = 1
  const next = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.ok(
    next.pawns.reduce((sum, p) => sum + p.hp, 0) >
      state.pawns.reduce((sum, p) => sum + p.hp, 0),
  )
  assert.equal(next.lastClashRound, 5)
})

test('Support feedback accompanies the strike in local, AI and online playback, including reduced motion', () => {
  for (const Unit of [King, Wolf]) {
    const state = field([
      new Unit(1, 0, 0, 'player'),
      new King(2, 0, 1, 'player', 4),
      new King(3, 1, 0, 'enemy'),
    ])
    for (const mode of ['local', 'ai', 'online'] as const) {
      const result = playbackReducer(
        { state, frames: [] },
        { type: 'special', target: { q: 1, r: 0 } },
        mode,
      )
      assert.equal(result.frames.length, 1)
      assert.equal(result.frames[0].effect?.support?.recipients.length, 1)
      assert.equal(frameDelay(result.frames[0], true), 700)
      assert.equal(playbackReducer(result, { type: 'endTurn' }, mode), result)
    }
  }
})
