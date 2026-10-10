import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { initialState as coreState } from '../../src/lib/engine/index.ts'
import { createBotGame } from '../../src/lib/engine/bot.ts'
import { winnableAgainst } from '../campaign-actions.ts'

const original = CAMPAIGNS[1]

test('All twenty distinct campaign encounters are winnable against normal AI', async () => {
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
    assert.ok(await winnableAgainst(level, 'normal'), 'Level ' + level.id + ': ' + level.name)
    assert.deepEqual(
      (await bot.transition(bot.initialState(level.seed, level.setup), { type: 'restart' }))
        .state,
      bot.initialState(level.seed, level.setup),
    )
  }
  assert.deepEqual(biomes, new Set(['verdant', 'mountains', 'desert', 'volcano', 'hell']))
})

test('The introductory bowman can finish the battle if the player stays idle', async () => {
  const level = original.levels[1]
  const bot = createBotGame()
  let state = bot.initialState(level.seed, level.setup)
  for (let step = 0; step < 40 && !state.winner; step++)
    state = (await bot.transition(state, { type: 'endTurn' })).state
  assert.equal(state.winner, 'enemy')
})

test('The tutorial is winnable against its own AI', async () => {
  const [level] = CAMPAIGNS[0].levels
  assert.ok(await winnableAgainst(level, level.difficulty))
})
