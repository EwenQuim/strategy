import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseGameSearch } from '../src/lib/game-mode.ts'
import { createBotGame } from '../src/lib/engine/bot.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import { initialState, transition } from '../src/lib/engine/engine.ts'
import { MAP_WIDTH } from '../src/lib/engine/hex.ts'
import type { BattleSetup } from '../src/lib/engine/index.ts'

const setup = {
  biome: 'desert',
  player: ['king', 'swordsman', 'archer', 'bulwark'],
  enemy: ['king', 'ninja', 'magician'],
} as const satisfies BattleSetup

test('Custom search keeps valid settings, snapshots armies and safely rejects malformed URLs', () => {
  assert.deepEqual(parseGameSearch({}), { mode: 'ai' })
  assert.deepEqual(parseGameSearch({ mode: 'bad', difficulty: 'toString' }), { mode: 'ai' })
  assert.deepEqual(parseGameSearch({ symmetric: true }), { mode: 'ai', symmetric: true })
  assert.deepEqual(parseGameSearch({ symmetric: 'false' }), { mode: 'ai' })
  for (const mode of ['ai', 'local'] as const) {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const search = parseGameSearch({ mode, difficulty, setup })
      assert.deepEqual(search, { mode, difficulty, setup })
      assert.notEqual(search.setup?.player, setup.player)
      assert.notEqual(search.setup?.enemy, setup.enemy)
      assert.deepEqual(initialState('custom', search.setup).setup, setup)
    }
  }
  for (const invalid of [
    null,
    'bad',
    [],
    {},
    { ...setup, biome: 'ocean' },
    { ...setup, biome: 'toString' },
    { ...setup, map: [] },
    { ...setup, player: [] },
    { ...setup, player: ['swordsman'] },
    { ...setup, player: ['king', 'king'] },
    { ...setup, player: ['king', 'toString'] },
    { ...setup, enemy: ['king', ...Array(MAP_WIDTH * 3).fill('archer')] },
    { ...setup, enemy: ['king', { kind: 'archer', col: 0, row: 0 }] },
  ]) {
    assert.deepEqual(parseGameSearch({ mode: 'local', difficulty: 'hard', setup: invalid }), {
      mode: 'local',
      difficulty: 'hard',
    })
  }
})

test('Custom search accepts more Bulwarks than one front row', () => {
  const bulwarks: BattleSetup['player'] = ['king', ...Array(MAP_WIDTH + 1).fill('bulwark')]
  const many = { ...setup, player: bulwarks }
  const search = parseGameSearch({ mode: 'local', difficulty: 'hard', setup: many })
  assert.deepEqual(search, { mode: 'local', difficulty: 'hard', setup: many })
  assert.equal(
    initialState('custom', search.setup).pawns.filter((p) => p.kind === 'bulwark').length,
    MAP_WIDTH + 1,
  )
})

test('Custom playback applies the selected difficulty, preserves setups on restart and ignores AI in 2P', () => {
  const outcomes = new Set<string>()
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const bot = createBotGame(difficulty)
    const opening = initialPlayback('custom-difficulty-8', 'ai', setup)
    let playback = opening
    for (let turn = 0; turn < 4 && !playback.state.winner; turn++) {
      const expected = bot.transition(playback.state, { type: 'endTurn' })
      playback = playbackReducer(playback, { type: 'endTurn' }, 'ai', difficulty)
      assert.deepEqual(playback, expected)
      playback = playbackReducer(playback, { type: 'playbackFinish' }, 'ai', difficulty)
    }
    outcomes.add(JSON.stringify(playback.state))
    assert.deepEqual(playbackReducer(playback, { type: 'restart' }, 'ai', difficulty), opening)
    const local = initialPlayback('custom-difficulty-8', 'local', setup)
    const expected = transition(local.state, { type: 'endTurn' })
    assert.deepEqual(playbackReducer(local, { type: 'endTurn' }, 'local', difficulty), {
      state: expected.state,
      frames: [],
    })
  }
  assert.ok(outcomes.size > 1, 'The fixture must distinguish difficulty settings')
})
