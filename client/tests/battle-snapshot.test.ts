import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Pawn, King, activePawn, transition, type GameState } from '../src/lib/engine/index.ts'
import { field } from './field.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
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

test('restoreState rejects unknown, inherited and non-string pawn kinds', () => {
  const saved = snapshotState(field([new King(1, 0, 0, 'player')]))
  for (const kind of ['tank', 'constructor', '__proto__', 'toString', null, 1, ['king']]) {
    assert.equal(restoreState({ ...saved, pawns: [{ ...saved.pawns[0], kind }] }), null)
  }
})

test('Legacy Escape chances are discarded on restore and cannot change reliable combat', () => {
  const state = field([new King(1, 0, 0, 'player'), new King(2, 1, 0, 'enemy')])
  state.escapes = Array.from({ length: 3 }, () => ({ kind: 'king', side: 'player' }))
  const saved = snapshotState(state)
  for (const pawn of saved.pawns) pawn.escapeChance = 100
  const restored = restoreState(JSON.parse(JSON.stringify(saved)))!
  assert.ok(restored.pawns.every((pawn) => !('escapeChance' in pawn)))
  assert.deepEqual(restored.escapes, state.escapes)
  const action = { type: 'special', target: { q: 1, r: 0 } } as const
  const result = transition(restored, action)
  assert.equal(result.state.pawns[1].hp, 5)
  assert.equal(result.state.randomState, restored.randomState)
  assert.deepEqual(result, transition(state, action))
  assert.deepEqual(result.state.escapes, state.escapes)
})

test('Saved battle identities distinguish depth-four campaign bots from ordinary Hard', () => {
  const bot = { name: 'depthsearch', options: BOT_LEVELS.hard } as const
  const ordinary = battleIdentity('ai', 'seed', bot, undefined)
  const brutal = battleIdentity(
    'ai',
    'seed',
    { ...bot, options: { ...bot.options, depth: 4 } },
    undefined,
  )
  assert.equal(isSameBattle(ordinary, brutal), false)
  assert.equal(isSameBattle(JSON.parse(JSON.stringify(brutal)), brutal), true)
})

test('isSameBattle only matches the identical game', () => {
  const identity = battleIdentity(
    'ai',
    'seed',
    { name: 'depthsearch', options: BOT_LEVELS.normal },
    undefined,
  )
  assert.ok(isSameBattle(identity, identity))
  assert.equal(
    isSameBattle(
      battleIdentity(
        'ai',
        'other',
        { name: 'depthsearch', options: BOT_LEVELS.normal },
        undefined,
      ),
      identity,
    ),
    false,
  )
  assert.equal(
    isSameBattle(
      battleIdentity(
        'local',
        'seed',
        { name: 'depthsearch', options: BOT_LEVELS.normal },
        undefined,
      ),
      identity,
    ),
    false,
  )
  assert.equal(
    isSameBattle(
      battleIdentity(
        'ai',
        'seed',
        { name: 'depthsearch', options: BOT_LEVELS.hard },
        undefined,
      ),
      identity,
    ),
    false,
  )
  assert.equal(
    isSameBattle(
      battleIdentity('ai', 'seed', { name: 'random', options: {} }, undefined),
      identity,
    ),
    false,
  )
  assert.equal(isSameBattle(null, identity), false)
})
