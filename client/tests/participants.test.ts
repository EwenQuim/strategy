import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_BOT_CONFIG, getBot } from '../src/bots/catalog.ts'
import {
  battleBots,
  battleControl,
  defaultParticipant,
  parseSideBots,
  participantBot,
} from '../src/bots/participants.ts'
import { parseGameSearch } from '../src/lib/game-mode.ts'
import { battleIdentity, isSameBattle } from '../src/lib/battleSnapshot.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import { activePawn } from '../src/lib/engine/index.ts'

test('Participant defaults provide human vs normal AI and independently editable options', () => {
  const first = defaultParticipant(true)
  const second = defaultParticipant(false)
  assert.equal(participantBot(first), null)
  assert.deepEqual(participantBot(second), DEFAULT_BOT_CONFIG)
  second.options.candidates = 3
  assert.notEqual(first.options.candidates, second.options.candidates)
  second.options.candidates = -1
  assert.throws(() => participantBot(second), RangeError)
})

test('Every human and bot pairing survives URLs and resolves the human viewer', () => {
  for (const player of [null, DEFAULT_BOT_CONFIG]) {
    for (const enemy of [null, DEFAULT_BOT_CONFIG]) {
      const sideBots = { player, enemy }
      const mode = player === null && enemy !== null ? 'ai' : 'local'
      const search = parseGameSearch(JSON.parse(JSON.stringify({ mode, sideBots })))
      assert.deepEqual(parseSideBots(search.sideBots), sideBots)
      assert.deepEqual(battleBots(mode, DEFAULT_BOT_CONFIG, sideBots), sideBots)
      const control = battleControl(mode, DEFAULT_BOT_CONFIG, sideBots)
      assert.equal(control.spectator, player !== null && enemy !== null)
      assert.equal(control.viewerSide, player !== null && enemy === null ? 'enemy' : 'player')
    }
  }
  assert.deepEqual(battleBots('ai'), { player: null, enemy: DEFAULT_BOT_CONFIG })
  assert.deepEqual(battleBots('local'), { player: null, enemy: null })
  assert.deepEqual(
    battleBots('online', DEFAULT_BOT_CONFIG, {
      player: DEFAULT_BOT_CONFIG,
      enemy: DEFAULT_BOT_CONFIG,
    }),
    { player: null, enemy: null },
  )
  for (const invalid of [null, [], {}, { player: null }])
    assert.equal(parseSideBots(invalid), undefined)
})

test('Bot-vs-bot playback advances both sides and preserves the setup on restart', async () => {
  const setup = {
    biome: 'verdant',
    player: ['king', 'archer'],
    enemy: ['king', 'archer'],
  } as const
  const opening = initialPlayback('spectator', 'local', setup)
  let playback = opening
  const acted = new Set<string>()
  const bots = {
    player: getBot({ name: 'random', options: {} }),
    enemy: getBot({ name: 'random', options: {} }),
  }
  for (let turn = 0; turn < 12 && !playback.state.winner; turn++) {
    const side = activePawn(playback.state)!.side
    acted.add(side)
    const previousRound = playback.state.round
    const actions = await bots[side].chooseActions(playback.state)
    playback = playbackReducer(playback, { type: 'botActions', actions }, 'local')
    assert.ok(playback.state.round >= previousRound)
    playback = playbackReducer(playback, { type: 'playbackFinish' }, 'local')
  }
  assert.deepEqual([...acted].sort(), ['enemy', 'player'])
  assert.deepEqual(playbackReducer(playback, { type: 'restart' }, 'local'), opening)
})

test('Saved matches distinguish both controllers and both bot option sets', () => {
  const sides = { player: DEFAULT_BOT_CONFIG, enemy: DEFAULT_BOT_CONFIG }
  const saved = battleIdentity('local', 'same-seed', sides, undefined)
  assert.ok(isSameBattle(saved, battleIdentity('local', 'same-seed', sides, undefined)))
  for (const side of ['player', 'enemy'] as const) {
    assert.equal(
      isSameBattle(
        saved,
        battleIdentity('local', 'same-seed', { ...sides, [side]: null }, undefined),
      ),
      false,
    )
    assert.equal(
      isSameBattle(
        saved,
        battleIdentity(
          'local',
          'same-seed',
          { ...sides, [side]: { name: 'random', options: {} } },
          undefined,
        ),
      ),
      false,
    )
  }
})
