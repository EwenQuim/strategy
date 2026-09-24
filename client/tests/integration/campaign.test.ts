import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGN_LEVELS } from '../../src/lib/campaign.ts'
import { initialState as coreState } from '../../src/lib/engine/index.ts'
import { initialState, transition } from '../../src/lib/bot.ts'
import { campaignActions } from '../campaign-actions.ts'

test('All twenty distinct campaign encounters are winnable against normal AI', () => {
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
    for (const caution of [0.25, 0.7, 1]) {
      state = initialState(level.seed, level.setup)
      for (let step = 0; step < 300 && !state.winner; step++) {
        for (const action of campaignActions(state, caution)) {
          const result = transition(state, action)
          assert.notEqual(result.state, state, 'Invalid action in level ' + level.id)
          state = result.state
        }
      }
      if (state.winner === 'player') break
    }
    assert.equal(state.winner, 'player', 'Level ' + level.id + ': ' + level.name)
    assert.deepEqual(
      transition(state, { type: 'restart' }).state,
      initialState(level.seed, level.setup),
    )
  }
  assert.deepEqual(biomes, new Set(['verdant', 'mountains', 'desert', 'volcano', 'hell']))
})

test('The introductory bowman can finish the battle if the player stays idle', () => {
  const level = CAMPAIGN_LEVELS[1]
  let state = initialState(level.seed, level.setup)
  for (let step = 0; step < 40 && !state.winner; step++)
    state = transition(state, { type: 'endTurn' }).state
  assert.equal(state.winner, 'enemy')
})
