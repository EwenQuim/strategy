import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Action, GameState } from '../src/lib/engine/index.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import { battleSetupTag, parseBattleRecord, replayBattle } from '../src/lib/battleRecord.ts'

const fingerprint = (state: GameState) =>
  JSON.stringify({
    ...state,
    setup: undefined,
    tiles: [...state.tiles.entries()],
    hellfire: state.hellfire,
    pawns: state.pawns.map((pawn) => ({ ...pawn, special: undefined })),
    log: undefined,
  })

function playBotTurns(seed: string, turns: number): { actions: Action[]; state: GameState } {
  const actions: Action[] = []
  let playback = initialPlayback(seed, 'ai')
  for (let i = 0; i < turns; i++) {
    actions.push({ type: 'endTurn' })
    playback = { ...playbackReducer(playback, { type: 'endTurn' }, 'ai', 'normal'), frames: [] }
  }
  return { actions, state: playback.state }
}

test('a recorded bot battle replays to the same state', () => {
  const { actions, state } = playBotTurns('replay-seed', 12)
  const replayed = replayBattle('replay-seed', 'ai', undefined, 'normal', actions)
  assert.equal(fingerprint(replayed.state), fingerprint(state))
  assert.equal(replayed.frames.length, 0)
})

test('an empty record replays to the initial state', () => {
  const fresh = initialPlayback('empty-seed', 'ai')
  const replayed = replayBattle('empty-seed', 'ai', undefined, 'normal', [])
  assert.equal(fingerprint(replayed.state), fingerprint(fresh.state))
})

test('a restart action in the record resets the battle', () => {
  const { actions } = playBotTurns('restart-seed', 6)
  const fresh = initialPlayback('restart-seed', 'ai')
  const replayed = replayBattle('restart-seed', 'ai', undefined, 'normal', [
    ...actions,
    { type: 'restart' },
  ])
  assert.equal(fingerprint(replayed.state), fingerprint(fresh.state))
})

test('parseBattleRecord round-trips saved actions', () => {
  const { actions } = playBotTurns('round-trip', 4)
  const raw = JSON.stringify({ setup: battleSetupTag(undefined), actions })
  assert.deepEqual(parseBattleRecord(raw, battleSetupTag(undefined)), actions)
})

test('parseBattleRecord rejects foreign or corrupt records', () => {
  const tag = battleSetupTag(undefined)
  assert.equal(parseBattleRecord(null, tag), null)
  assert.equal(parseBattleRecord('not json', tag), null)
  assert.equal(parseBattleRecord('[]', tag), null)
  assert.equal(parseBattleRecord(JSON.stringify({ setup: 'other', actions: [] }), tag), null)
  assert.equal(
    parseBattleRecord(JSON.stringify({ setup: tag, actions: [{ type: 'resync' }] }), tag),
    null,
  )
  assert.equal(
    parseBattleRecord(JSON.stringify({ setup: tag, actions: [{ type: 'move', q: 1 }] }), tag),
    null,
  )
})

test('parseBattleRecord distinguishes setups', () => {
  const setup = { biome: 'verdant', player: [], enemy: [] } as const
  const raw = JSON.stringify({ setup: battleSetupTag(setup), actions: [] })
  assert.deepEqual(parseBattleRecord(raw, battleSetupTag(setup)), [])
  assert.equal(parseBattleRecord(raw, battleSetupTag(undefined)), null)
})
