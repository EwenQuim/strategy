import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CAMPAIGN_LEVELS,
  parseCampaignProgress,
  isLevelUnlocked,
  completeCampaignLevel,
} from '../src/lib/campaign.ts'
import { initialState as coreState } from '../src/lib/engine/index.ts'
import { initialState, transition, chooseBotActions } from '../src/lib/bot.ts'
import { huntTheKing } from '../src/lib/strategies.ts'

test('The campaign has twenty distinct deterministic AI encounters that can finish', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 20)
  assert.equal(new Set(CAMPAIGN_LEVELS.map((level) => level.seed)).size, 20)
  assert.equal(new Set(CAMPAIGN_LEVELS.map((level) => level.name)).size, 20)
  assert.deepEqual(
    CAMPAIGN_LEVELS.map((level) => level.id),
    Array.from({ length: 20 }, (_, index) => index + 1),
  )
  const biomes = new Set<string>()
  for (const level of CAMPAIGN_LEVELS) {
    const core = coreState(level.seed, level.setup)
    assert.deepEqual(core, coreState(level.seed, level.setup))
    assert.equal(core.pawns.length, level.setup.player.length + level.setup.enemy.length)
    biomes.add(core.biome)
    let state = initialState(level.seed, level.setup)
    for (let step = 0; step < 300 && !state.winner; step++) {
      for (const action of chooseBotActions(state, huntTheKing)) {
        const result = transition(state, action)
        assert.notEqual(result.state, state)
        state = result.state
      }
    }
    assert.ok(state.winner, 'Level ' + level.id + ' must finish')
    if (level.id === 1 || level.id === 20) assert.equal(state.winner, 'player')
    assert.deepEqual(
      transition(state, { type: 'restart' }).state,
      initialState(level.seed, level.setup),
    )
  }
  assert.deepEqual(biomes, new Set(['verdant', 'mountains', 'desert']))
})

test('Campaign progress unlocks exactly the next level, never regresses, and stops at twenty', () => {
  let completed = 0
  for (let level = 1; level <= 20; level++) {
    for (let candidate = 1; candidate <= 20; candidate++)
      assert.equal(isLevelUnlocked(candidate, completed), candidate <= level)
    assert.equal(completeCampaignLevel(completed, level + 1), completed)
    completed = completeCampaignLevel(completed, level)
    assert.equal(completed, level)
    assert.equal(completeCampaignLevel(completed, 1), level)
    assert.equal(completeCampaignLevel(completed, level), level)
    assert.equal(parseCampaignProgress(String(completed)), completed)
  }
  for (const level of [-1, 0, 1.5, 21, NaN, Infinity]) {
    assert.equal(isLevelUnlocked(level, completed), false)
    assert.equal(completeCampaignLevel(completed, level), completed)
  }
})

test('Missing or corrupt local progress starts at level one instead of unlocking levels', () => {
  for (const value of [
    null,
    '',
    'garbage',
    '{}',
    '[]',
    'true',
    '-1',
    '1.5',
    '21',
    'Infinity',
    'NaN',
    '1e1',
  ])
    assert.equal(parseCampaignProgress(value), 0)
  assert.equal(parseCampaignProgress('0'), 0)
  assert.equal(parseCampaignProgress('19'), 19)
  assert.equal(parseCampaignProgress('20'), 20)
})
