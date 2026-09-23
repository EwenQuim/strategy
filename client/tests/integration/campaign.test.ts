import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGN_LEVELS } from '../../src/lib/campaign.ts'
import { initialState as coreState } from '../../src/lib/engine/index.ts'
import { initialState, transition } from '../../src/lib/bot.ts'
import { campaignActions } from '../campaign-actions.ts'

test('The campaign has twenty distinct deterministic AI levels that can finish', () => {
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
      for (const action of campaignActions(state)) {
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
  assert.deepEqual(biomes, new Set(['verdant', 'mountains', 'desert', 'volcano']))
})
