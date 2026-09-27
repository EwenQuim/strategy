import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { initialState as coreState } from '../../src/lib/engine/index.ts'
import { createBotGame } from '../../src/lib/engine/bot.ts'
import { winnableAgainst } from '../campaign-actions.ts'

const original = CAMPAIGNS[0]

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

test('Every shattered encounter stays winnable at its own difficulty', () => {
  const shattered = CAMPAIGNS[2]
  assert.equal(shattered.levels.length, 10)
  for (const level of shattered.levels)
    assert.ok(
      winnableAgainst(level, level.difficulty),
      'Shattered level ' + level.id + ': ' + level.name,
    )
})

test('The introductory bowman can finish the battle if the player stays idle', () => {
  const level = original.levels[1]
  const bot = createBotGame()
  let state = bot.initialState(level.seed, level.setup)
  for (let step = 0; step < 40 && !state.winner; step++)
    state = bot.transition(state, { type: 'endTurn' }).state
  assert.equal(state.winner, 'enemy')
})
