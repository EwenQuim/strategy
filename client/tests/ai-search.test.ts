import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  initialState,
  reducer,
  activePawn,
  Archer,
  King,
  Swordsman,
  type GameState,
} from '../src/lib/engine/index.ts'
import { DepthsearchBot, searchStats } from '../src/bots/strategies/depthsearch.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { positionKey, turnPlans } from '../src/lib/engine/ai/turns.ts'

function battle(): GameState {
  const state = initialState('signature-search')
  state.tiles = new Map()
  for (let q = -3; q <= 4; q++)
    for (let r = -3; r <= 3; r++) state.tiles.set(`${q},${r}`, { q, r, terrain: 'plain' })
  state.pawns = [
    new Archer(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 3, 0, 'enemy', 2),
    new Swordsman(4, 2, 1, 'enemy'),
  ]
  state.order = [1, 3, 2, 4]
  state.active = 0
  return state
}

test('Plans use at most one signature and finish the activation', () => {
  const state = battle()
  const before = structuredClone(state)
  const plans = turnPlans(state)
  assert.ok(plans.some((plan) => plan.actions.some((a) => a.type === 'special')))
  for (const plan of plans) {
    assert.ok(plan.actions.filter((a) => a.type === 'special').length <= 1)
    assert.deepEqual(plan.actions.reduce(reducer, state), plan.state)
    assert.ok(plan.state.winner || activePawn(plan.state)?.id !== 1)
  }
  assert.deepEqual(structuredClone(state), before)
})

test('Depths two through four find a reliable winning shot without mutating input', async () => {
  const state = battle(),
    before = structuredClone(state)
  for (const depth of [2, 3, 4] as const) {
    const actions = await new DepthsearchBot({ ...BOT_LEVELS.hard, depth }).chooseActions(state)
    assert.equal(actions.reduce(reducer, state).winner, 'player')
    assert.ok(searchStats.leafEvals <= 1700)
  }
  assert.deepEqual(structuredClone(state), before)
})

test('Search position identities include collected runes and the random stream', () => {
  const state = battle(),
    other = battle()
  other.tiles.get('0,0')!.feature = 'rune'
  assert.notEqual(positionKey(state), positionKey(other))
  other.tiles.get('0,0')!.feature = undefined
  other.randomState++
  assert.notEqual(positionKey(state), positionKey(other))
})

test('Search distinguishes identical armies with different Hellfire warnings or initiative', () => {
  const state = battle()
  assert.notEqual(
    positionKey(state),
    positionKey({
      ...state,
      hazards: [{ kind: 'hellfire', centers: [{ q: 0, r: 0 }] }],
    }),
  )
  assert.notEqual(
    positionKey(state),
    positionKey({ ...state, order: state.order.toReversed() }),
  )
})

test('Depth-four analysis respects its evaluation budget through a crowded reply tree', async () => {
  const state = battle()
  state.pawns[2].hp = 6
  const before = structuredClone(state)
  const bot = new DepthsearchBot({ ...BOT_LEVELS.hard, depth: 4, beamWidth: 32 })
  const actions = await bot.chooseActions(state)
  assert.ok(searchStats.budgetBreaks > 0)
  assert.ok(searchStats.leafEvals <= 1500)
  let played = state
  for (const action of actions) {
    const next = reducer(played, action)
    assert.notEqual(next, played)
    played = next
  }
  assert.deepEqual(structuredClone(state), before)
  assert.deepEqual(await bot.chooseActions(state), actions)
})
