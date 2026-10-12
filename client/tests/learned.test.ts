import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LearnedBot, LEARNED_LEVELS } from '../src/bots/strategies/learned.ts'
import { VALUE_FEATURES, valueFeatures, outcome } from '../src/bots/valueFeatures.ts'
import { VALUE_MODELS, predictValue } from '../src/bots/valueModel.ts'
import { getBot, parseBotConfig } from '../src/bots/catalog.ts'
import { King, Archer, Swordsman, Ninja, reducer, activePawn } from '../src/lib/engine/index.ts'
import { field } from './field.ts'

test('Learned features and probabilities swap perspective exactly without encoding ids', () => {
  const state = field([
    new Archer(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 3, 0, 'enemy', 4),
    new Swordsman(4, 2, 1, 'enemy'),
  ])
  const cache = { reach: new Map() }
  const player = valueFeatures(state, 'player', cache)
  const enemy = valueFeatures(state, 'enemy', cache)
  assert.equal(player.length, VALUE_FEATURES.length)
  assert.ok(player.every(Number.isFinite))
  player.forEach((v, i) => assert.equal(v + enemy[i], 0))
  assert.ok(
    Math.abs(
      predictValue(player, VALUE_MODELS['league-v1']) +
        predictValue(enemy, VALUE_MODELS['league-v1']) -
        1,
    ) < 1e-12,
  )
  const renumbered = {
    ...state,
    pawns: state.pawns.map((p) => {
      const cloned = p.clone()
      return Object.assign(cloned, { id: p.id + 100 })
    }),
    order: state.order.map((id) => id + 100),
  }
  assert.deepEqual(valueFeatures(renumbered, 'player', { reach: new Map() }), player)
})

test('Every preset round trips through the shared catalog with owned immutable options', () => {
  for (const options of Object.values(LEARNED_LEVELS)) {
    const config = { name: 'learned', options } as const
    assert.deepEqual(parseBotConfig(JSON.parse(JSON.stringify(config))), config)
    assert.deepEqual(getBot(config).options, options)
    assert.notEqual(getBot(config), getBot(config))
  }
  for (const options of [
    { simulations: 0 },
    { candidates: 1 },
    { exploration: NaN },
    { model: 'missing' },
    { horizon: 65 },
  ])
    assert.throws(() => new LearnedBot(options as never), RangeError)
})

test('A winning signature is selected even with one simulation and dense alternate plans', async () => {
  const state = field([
    new Archer(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 3, 0, 'enemy', 2),
    new Swordsman(4, 2, 1, 'enemy'),
  ])
  const before = structuredClone(state)
  const actions = await new LearnedBot({ simulations: 1 }).chooseActions(state)
  const result = actions.reduce(reducer, state)
  assert.equal(result.winner, 'player')
  assert.equal(outcome(result, 'player'), 1)
  assert.equal(outcome(result, 'enemy'), 0)
  assert.deepEqual(structuredClone(state), before)
})

test('Enemy initiative can repeat; the learned search defends against a direct winning reply', async () => {
  const state = field([
    new King(1, 0, 0, 'enemy', 3),
    new Ninja(2, 2, 0, 'player'),
    new Swordsman(3, 5, -3, 'player'),
    new King(4, 5, 5, 'player'),
  ])
  const actions = await new LearnedBot({ simulations: 32 }).chooseActions(state)
  const next = actions.reduce(reducer, state)
  if (next.winner === 'enemy') return
  const enemyReply = await new LearnedBot({ simulations: 64 }).chooseActions(next)
  assert.notEqual(enemyReply.reduce(reducer, next).winner, 'player')
})

test('Search proposes a legal complete activation, is deterministic and ignores the real future random stream', async () => {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -4, 0, 'player'),
    new Swordsman(3, 2, 0, 'enemy'),
    new King(4, 4, 0, 'enemy'),
  ])
  const before = structuredClone(state)
  const bot = new LearnedBot({ simulations: 32 })
  const actions = await bot.chooseActions(state)
  assert.deepEqual(await bot.chooseActions({ ...state, randomState: 12345 }), actions)
  let next = state
  for (const action of actions) {
    const result = reducer(next, action)
    assert.notEqual(result, next)
    next = result
  }
  assert.ok(next.winner || activePawn(next)?.id !== 1)
  assert.deepEqual(structuredClone(state), before)
})
