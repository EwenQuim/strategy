import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  initialState,
  reducer,
  transition,
  activePawn,
  King,
  Swordsman,
} from '../src/lib/engine/index.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import { field } from './field.ts'

test('Invalid movement and targeting preserve rules and playback references', () => {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 3, 0, 'enemy'),
  ])
  for (const action of [
    { type: 'move', q: 99, r: 99 },
    { type: 'special', target: { q: 99, r: 99 }, destination: { q: 0, r: 0 } },
  ] as const) {
    assert.equal(reducer(state, action), state)
    assert.deepEqual(transition(state, action).frames, [])
    const playback = { state, frames: [] }
    assert.equal(playbackReducer(playback, action, 'local').state, state)
  }
})

test('Human and bot ability commands use the same playback snapshots and input locking', () => {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 3, 0, 'enemy'),
  ])
  const action = {
    type: 'special',
    target: { q: 3, r: 0 },
    destination: { q: 2, r: 0 },
  } as const
  const playback = playbackReducer({ state, frames: [] }, action, 'local')
  assert.equal(playback.state.pawns[2].hp, 5)
  assert.ok(playback.frames.length)
  assert.equal(playbackReducer(playback, { type: 'endTurn' }, 'local'), playback)
  const done = playbackReducer(playback, { type: 'playbackFinish' }, 'local')
  assert.equal(done.frames.length, 0)
  assert.equal(activePawn(done.state)?.id, 1)
})

test('Restart restores the authored seed and initial deployment', () => {
  const state = initialState('restart-signature')
  const ended = reducer(state, { type: 'endTurn' })
  assert.deepEqual(reducer(ended, { type: 'restart' }), state)
  assert.deepEqual(initialPlayback('restart-signature', 'ai').state, state)
})
