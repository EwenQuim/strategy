import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Pawn, activePawn, type GameState } from '../src/lib/engine/index.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import {
  battleIdentity,
  restoreState,
  isSameBattle,
  snapshotState,
} from '../src/lib/battleSnapshot.ts'

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .map(([property, entry]) => [property, canonical(entry)] as const)
            .sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : value

const fingerprint = (state: GameState) =>
  JSON.stringify(canonical({ ...state, tiles: [...state.tiles.entries()], pawns: state.pawns }))

function playBotTurns(seed: string, turns: number): GameState {
  let playback = initialPlayback(seed, 'ai')
  for (let i = 0; i < turns; i++) {
    playback = { ...playbackReducer(playback, { type: 'endTurn' }, 'ai'), frames: [] }
  }
  return playback.state
}

const roundTrip = (state: GameState) =>
  restoreState(JSON.parse(JSON.stringify(snapshotState(state))))

test('a snapshot round-trips a played battle to the same state', () => {
  const state = playBotTurns('snapshot-seed', 12)
  const restored = roundTrip(state)
  assert.ok(restored)
  assert.equal(fingerprint(restored), fingerprint(state))
})

test('restored pawns are working class instances', () => {
  const state = playBotTurns('snapshot-pawns', 6)
  const restored = roundTrip(state)
  assert.ok(restored)
  assert.ok(restored.pawns.every((pawn) => pawn instanceof Pawn))
  const pawn = activePawn(restored)
  assert.ok(pawn)
  assert.equal(pawn.special.cost, activePawn(state)!.special.cost)
  assert.equal(pawn.maxHp, activePawn(state)!.maxHp)
})

test('restoreState rejects unreadable snapshots', () => {
  assert.equal(restoreState(null), null)
  assert.equal(restoreState({}), null)
  assert.equal(restoreState({ pawns: [{ kind: 'tank' }] }), null)
})

test('isSameBattle only matches the identical game', () => {
  const identity = battleIdentity(
    'ai',
    'seed',
    { name: 'depthsearch', difficulty: 'normal' },
    undefined,
  )
  assert.ok(isSameBattle(identity, identity))
  assert.equal(
    isSameBattle(
      battleIdentity('ai', 'other', { name: 'depthsearch', difficulty: 'normal' }, undefined),
      identity,
    ),
    false,
  )
  assert.equal(
    isSameBattle(
      battleIdentity('local', 'seed', { name: 'depthsearch', difficulty: 'normal' }, undefined),
      identity,
    ),
    false,
  )
  assert.equal(
    isSameBattle(
      battleIdentity('ai', 'seed', { name: 'depthsearch', difficulty: 'hard' }, undefined),
      identity,
    ),
    false,
  )
  assert.equal(
    isSameBattle(battleIdentity('ai', 'seed', { name: 'mistral' }, undefined), identity),
    false,
  )
  assert.equal(isSameBattle(null, identity), false)
})
