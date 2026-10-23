import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CaesarBot, CAESAR_LEVELS } from '../src/bots/strategies/caesar.ts'
import { HannibalBot } from '../src/bots/strategies/hannibal.ts'
import { getBot, parseBotConfig } from '../src/bots/catalog.ts'
import { King, Swordsman, reducer, activePawn } from '../src/lib/engine/index.ts'
import { hexDist } from '../src/lib/engine/hex.ts'
import { field } from './field.ts'

test('Every preset round trips through the shared catalog with owned immutable options', () => {
  for (const options of Object.values(CAESAR_LEVELS)) {
    const config = { name: 'caesar', options } as const
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
    { pressure: -0.1 },
  ])
    assert.throws(() => new CaesarBot(options as never), RangeError)
})

test('A winning signature is selected even with one simulation', async () => {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 3, 0, 'enemy', 2),
    new Swordsman(4, 2, 1, 'enemy'),
  ])
  const actions = await new CaesarBot({ simulations: 1 }).chooseActions(state)
  assert.equal(actions.reduce(reducer, state).winner, 'player')
})

test('The patient crown still takes a winning regicide with its own hand', async () => {
  const state = field([
    new King(1, 0, 0, 'player'),
    new King(2, 1, 0, 'enemy', 2),
    new Swordsman(3, 4, 4, 'enemy'),
  ])
  const actions = await new CaesarBot({ simulations: 1 }).chooseActions(state)
  assert.equal(actions.reduce(reducer, state).winner, 'player')
})

test('Caesar advances on the enemy king instead of shuffling in its own zone', async () => {
  const state = field([
    new Swordsman(1, 0, 0, 'enemy'),
    new King(2, 0, 5, 'enemy'),
    new King(3, 0, -5, 'player'),
    new Swordsman(4, 1, -4, 'player'),
  ])
  const actor = activePawn(state)!
  const actions = await new CaesarBot({ simulations: 32 }).chooseActions(state)
  const moved = actions.filter((action) => action.type === 'move')
  assert.ok(moved.length)
  const after = moved.reduce(reducer, state).pawns.find((p) => p.id === actor.id)!
  assert.ok(
    hexDist(
      after,
      state.pawns.find((p) => p.id === 3)!,
    ) <
      hexDist(
        actor,
        state.pawns.find((p) => p.id === 3)!,
      ),
  )
})

test('Search proposes a legal complete activation, is deterministic and ignores the real future random stream', async () => {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -4, 0, 'player'),
    new Swordsman(3, 2, 0, 'enemy'),
    new King(4, 4, 0, 'enemy'),
  ])
  const before = structuredClone(state)
  const bot = new CaesarBot({ simulations: 32 })
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

test('Caesar never moves backward when Hannibal itself would advance', async () => {
  const state = field([
    new Swordsman(1, 0, 0, 'enemy'),
    new King(2, 0, 5, 'enemy'),
    new King(3, 0, -5, 'player'),
    new Swordsman(4, 1, -4, 'player'),
  ])
  const target = state.pawns.find((p) => p.id === 3)!
  const distance = (bot: CaesarBot | HannibalBot) =>
    bot
      .chooseActions(state)
      .then((actions) =>
        actions
          .filter((action) => action.type === 'move')
          .reduce(reducer, state)
          .pawns.find((p) => p.id === 1)!,
      )
      .then((pawn) => hexDist(pawn, target))
  const caesar = await distance(new CaesarBot({ simulations: 128 }))
  const hannibal = await distance(new HannibalBot({ simulations: 128 }))
  assert.ok(caesar <= hannibal)
})
