import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Pawn, activePawn, type GameState } from '../src/lib/engine/index.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import {
  battleIdentity,
  restoreState,
  sameBattle,
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
    playback = { ...playbackReducer(playback, { type: 'endTurn' }, 'ai', 'normal'), frames: [] }
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

test('sameBattle only matches the identical game', () => {
  const identity = battleIdentity('ai', 'seed', 'normal', undefined)
  assert.ok(sameBattle(identity, identity))
  assert.equal(sameBattle(battleIdentity('ai', 'other', 'normal', undefined), identity), false)
  assert.equal(
    sameBattle(battleIdentity('local', 'seed', 'normal', undefined), identity),
    false,
  )
  assert.equal(sameBattle(battleIdentity('ai', 'seed', 'hard', undefined), identity), false)
  assert.equal(sameBattle(null, identity), false)
})
