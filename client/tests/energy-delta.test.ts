import assert from 'node:assert/strict'
import { test } from 'node:test'
import { King, Swordsman, key, transition } from '../src/lib/engine/index.ts'
import { playbackReducer } from '../src/lib/playback.ts'
import { field } from './field.ts'

function battle() {
  return field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 3, 0, 'enemy'),
  ])
}

test('Moves and specials report the acting pawn energy delta on their effect', () => {
  const move = transition(battle(), { type: 'move', q: 2, r: 0 })
  assert.equal(move.frames[0].effect?.energyDelta, -2)
  assert.deepEqual(move.frames[0].effect?.energyAt, { q: 2, r: 0 })
  assert.equal(move.state.pawns[0].energy, 1)

  const charge = transition(battle(), {
    type: 'special',
    target: { q: 3, r: 0 },
    destination: { q: 2, r: 0 },
  })
  assert.equal(charge.frames[0].effect?.energyDelta, -2)
  // The spend feedback anchors at the acting pawn, never at the special's target.
  assert.deepEqual(charge.frames[0].effect?.energyAt, { q: 2, r: 0 })
  assert.equal(charge.state.pawns[0].energy, 1)
})

test('A rune pickup nets into the energy delta of the move that collects it', () => {
  const state = battle()
  state.tiles.set(key(1, 0), { q: 1, r: 0, terrain: 'plain', feature: 'rune' })
  const move = transition(state, { type: 'move', q: 1, r: 0 })
  assert.equal(move.frames[0].effect?.energyDelta, 1)
  assert.deepEqual(move.frames[0].effect?.energyAt, { q: 1, r: 0 })
  assert.equal(move.state.pawns[0].energy, 4)
})

test('Own actions keep their energy frames so the player sees their own spends', () => {
  const playback = playbackReducer(
    { state: battle(), frames: [] },
    { type: 'move', q: 2, r: 0 },
    'local',
  )
  assert.equal(playback.frames.length, 1)
  assert.equal(playback.frames[0].effect?.energyDelta, -2)

  // Actions that neither spend nor grant energy still produce no frame.
  const idle = playbackReducer({ state: battle(), frames: [] }, { type: 'endTurn' }, 'local')
  assert.deepEqual(idle.frames, [])
})
