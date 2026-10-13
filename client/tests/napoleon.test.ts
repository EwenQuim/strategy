import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NapoleonBot, NAPOLEON_LEVELS } from '../src/bots/strategies/napoleon.ts'
import { BOTS, DEFAULT_BOT_CONFIG, getBot, parseBotConfig } from '../src/bots/catalog.ts'
import { evaluateArmy } from '../src/lib/engine/ai/army.ts'
import { Archer, King, Ninja, Swordsman, activePawn, reducer } from '../src/lib/engine/index.ts'
import { field } from './field.ts'

test('Napoleon is the default and all presets retain independent options through URL serialization', () => {
  assert.equal(DEFAULT_BOT_CONFIG.name, 'napoleon')
  for (const options of Object.values(NAPOLEON_LEVELS)) {
    const config = { name: 'napoleon', options } as const
    const restored = parseBotConfig(JSON.parse(JSON.stringify(config)))
    assert.deepEqual(restored, config)
    assert.deepEqual(getBot(restored).options, options)
    assert.notEqual(getBot(restored), getBot(restored))
  }
  assert.deepEqual(BOTS.napoleon.presets.brutal, NAPOLEON_LEVELS.brutal)
  for (const options of [
    { candidates: 0 },
    { replies: 5 },
    { caution: NaN },
    { aggression: -1 },
  ])
    assert.throws(() => new NapoleonBot(options), RangeError)
})

test('Every Napoleon preset takes a winning signature and leaves the input untouched', async () => {
  const state = field([
    new Archer(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 3, 0, 'enemy', 2),
    new Swordsman(4, 2, 1, 'enemy'),
  ])
  const before = structuredClone(state)
  for (const options of Object.values(NAPOLEON_LEVELS)) {
    const actions = await new NapoleonBot(options).chooseActions(state)
    assert.equal(actions.reduce(reducer, state).winner, 'player')
    assert.ok(actions.filter((action) => action.type === 'special').length <= 1)
  }
  assert.deepEqual(structuredClone(state), before)
})

test('Napoleon saves a threatened king when the threatening enemy acts beyond depth four', async () => {
  const king = new King(1, 0, 0, 'enemy', 3)
  const ninja = new Ninja(6, 2, 0, 'player')
  const state = field([
    king,
    new Swordsman(2, -3, -3, 'enemy'),
    new Swordsman(3, -4, 0, 'enemy'),
    new Swordsman(4, 4, -4, 'enemy'),
    new Swordsman(5, -4, 4, 'enemy'),
    ninja,
    new King(7, 5, 5, 'player'),
  ])
  const actions = await new NapoleonBot(NAPOLEON_LEVELS.brutal).chooseActions(state)
  const next = actions.reduce(reducer, state)
  const survivor = next.pawns.find((pawn) => pawn.id === king.id)!
  assert.ok(survivor)
  if (!next.pawns.some((pawn) => pawn.id === ninja.id)) return
  assert.ok(survivor.q !== king.q || survivor.r !== king.r)
  // Freeze intervening allies to test the king's own escape, then let Ninja choose a turn.
  let threatened = next
  while (activePawn(threatened)?.id !== ninja.id)
    threatened = reducer(threatened, { type: 'endTurn' })
  const response = await new NapoleonBot(NAPOLEON_LEVELS.brutal).chooseActions(threatened)
  assert.notEqual(response.reduce(reducer, threatened).winner, 'player')
})

test('Army evaluation rewards another ally gaining a productive position and recomputes enemy locations', () => {
  const state = field([
    new King(1, -4, 4, 'player'),
    new Archer(2, -3, 0, 'player'),
    new King(3, 5, 5, 'enemy'),
    new Swordsman(4, 3, 0, 'enemy'),
  ])
  const cache = { reach: new Map(), distances: new WeakMap() }
  const weights = { aggression: 1, caution: 0 }
  const before = evaluateArmy(state, 'player', weights, cache, false)
  const positioned = { ...state, pawns: state.pawns.map((p) => p.clone()) }
  positioned.pawns[1].q = 0
  assert.ok(evaluateArmy(positioned, 'player', weights, cache, false) > before)
  const far = { ...positioned, pawns: positioned.pawns.map((p) => p.clone()) }
  far.pawns[3].q = 5
  far.pawns[3].r = -4
  const farScore = evaluateArmy(far, 'player', weights, cache)
  assert.equal(
    farScore,
    evaluateArmy(far, 'player', weights, { reach: new Map(), distances: new WeakMap() }),
  )
})

test('Napoleon is deterministic, ends its activation and does not peek at future Hellfire randomness', async () => {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -4, 0, 'player'),
    new Swordsman(3, 2, 0, 'enemy'),
    new King(4, 4, 0, 'enemy'),
  ])
  const bot = new NapoleonBot()
  const expected = await bot.chooseActions(state)
  for (const randomState of [1, 23, 54321])
    assert.deepEqual(await bot.chooseActions({ ...state, randomState }), expected)
  let next = state
  for (const action of expected) {
    const applied = reducer(next, action)
    assert.notEqual(applied, next)
    next = applied
  }
  assert.ok(next.winner || activePawn(next)?.id !== 1)
})
