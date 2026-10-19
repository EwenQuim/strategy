import assert from 'node:assert/strict'
import { test } from 'node:test'
import { King, activePawn } from '../src/lib/engine/index.ts'
import { recall, remember } from '../src/lib/commandMemory.ts'
import { field } from './field.ts'

const state = field([new King(1, 0, 0, 'player'), new King(2, 3, 0, 'enemy')])
const pawn = activePawn(state)!
const moved = { ...state }
const nextRound = { ...state, round: state.round + 1 }

test('Move mode opens every activation until the player leaves it', () => {
  assert.deepEqual(recall(null, state, pawn, true), {
    aim: null,
    moveMode: true,
    dismissed: false,
  })
  assert.equal(recall(null, state, undefined, true).moveMode, false)
})

test('An aim lasts one state and only while the player can command', () => {
  const memory = remember(state, pawn, { aim: { action: 'special' } })
  assert.deepEqual(recall(memory, state, pawn, true).aim, { action: 'special' })
  assert.equal(recall(memory, state, pawn, false).aim, null)
  assert.equal(recall(memory, moved, pawn, true).aim, null)
  assert.equal(recall(memory, moved, pawn, true).moveMode, true)
})

test('A canceled aim quiets one state, a dismissal the whole activation', () => {
  const canceled = remember(state, pawn, { quiet: 'state' })
  assert.equal(recall(canceled, state, pawn, true).moveMode, false)
  assert.equal(recall(canceled, moved, pawn, true).moveMode, true)
  const dismissed = remember(state, pawn, { quiet: 'activation' })
  assert.equal(recall(dismissed, moved, pawn, true).moveMode, false)
  assert.equal(recall(dismissed, moved, pawn, true).dismissed, true)
  assert.equal(recall(dismissed, nextRound, pawn, true).moveMode, true)
})
