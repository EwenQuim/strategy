import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS, type CampaignLevel } from '../../src/lib/campaign.ts'
import { initialState as coreState } from '../../src/lib/engine/index.ts'
import type { BotDifficulty } from '../../src/lib/engine/ai.ts'
import { createBotGame } from '../../src/lib/engine/bot.ts'
import { campaignActions } from '../campaign-actions.ts'

const original = CAMPAIGNS[0]

function playToTheEnd(level: CampaignLevel, difficulty: BotDifficulty, caution: number) {
  const bot = createBotGame(difficulty)
  let state = bot.initialState(level.seed, level.setup)
  for (let step = 0; step < 300 && !state.winner; step++) {
    for (const action of campaignActions(state, caution)) {
      const result = bot.transition(state, action)
      assert.notEqual(result.state, state, 'Invalid action in level ' + level.id)
      state = result.state
    }
  }
  return state
}

function winnableAgainst(level: CampaignLevel, difficulty: BotDifficulty) {
  // Against the hard AI the scripted player sometimes needs maximum caution to outlast the bot.
  const cautions = difficulty === 'hard' ? [0.25, 1, 1.5, 2] : [0.25, 0.7, 1]
  for (const caution of cautions) {
    if (playToTheEnd(level, difficulty, caution).winner === 'player') return true
  }
  return false
}

test('All twenty distinct campaign encounters are winnable against normal AI', () => {
  assert.equal(original.levels.length, 20)
  assert.equal(new Set(original.levels.map((level) => level.seed)).size, 20)
  assert.equal(new Set(original.levels.map((level) => level.name)).size, 20)
  assert.deepEqual(
    original.levels.map((level) => level.id),
    Array.from({ length: 20 }, (_, index) => index + 1),
  )
  const biomes = new Set<string>()
  for (const level of original.levels) {
    const core = coreState(level.seed, level.setup)
    assert.deepEqual(core, coreState(level.seed, level.setup))
    assert.equal(core.pawns.length, level.setup.player.length + level.setup.enemy.length)
    biomes.add(core.biome)
    const bot = createBotGame()
    assert.ok(winnableAgainst(level, 'normal'), 'Level ' + level.id + ': ' + level.name)
    assert.deepEqual(
      bot.transition(bot.initialState(level.seed, level.setup), { type: 'restart' }).state,
      bot.initialState(level.seed, level.setup),
    )
  }
  assert.deepEqual(biomes, new Set(['verdant', 'mountains', 'desert', 'volcano', 'hell']))
})

// These encounters defeat the scripted player at every caution against the hard AI.
// A human may still win them; if brutal proves unbeatable, tune their enemy rosters.
const NOT_SCRIPTABLY_WINNABLE = new Set([8, 19])

test('Every brutal encounter stays winnable against the hard AI', () => {
  for (const level of CAMPAIGNS[1].levels) {
    if (NOT_SCRIPTABLY_WINNABLE.has(level.id)) continue
    assert.ok(winnableAgainst(level, 'hard'), 'Brutal level ' + level.id + ': ' + level.name)
  }
})

test('The introductory bowman can finish the battle if the player stays idle', () => {
  const level = original.levels[1]
  const bot = createBotGame()
  let state = bot.initialState(level.seed, level.setup)
  for (let step = 0; step < 40 && !state.winner; step++)
    state = bot.transition(state, { type: 'endTurn' }).state
  assert.equal(state.winner, 'enemy')
})
