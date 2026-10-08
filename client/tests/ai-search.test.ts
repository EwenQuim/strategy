import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activePawn,
  initialState,
  reducer,
  hexOf,
  Archer,
  Bulwark,
  King,
  Ninja,
  Swordsman,
  type Action,
  type GameState,
  type Pawn,
} from '../src/lib/engine/index.ts'
import { turnOutcomes } from '../src/lib/engine/ai/strategies/depthsearch.ts'
import { chooseBotActions } from '../src/lib/engine/bot.ts'
import { turnPlans } from '../src/lib/engine/ai/turns.ts'

function battle(pawns: Pawn[], order = pawns.map((p) => p.id), active = 0): GameState {
  const tiles: GameState['tiles'] = new Map()
  for (let q = -6; q <= 6; q++)
    for (let r = -6; r <= 6; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    ...initialState('ai-search-test'),
    biome: 'verdant',
    hellfire: [],
    pawns,
    tiles,
    order,
    active,
  }
}

// Plans are enumerated in the world where every attack against the active side's foes lands.
function allHitWorld(state: GameState): GameState {
  const side = activePawn(state)!.side
  return {
    ...state,
    pawns: state.pawns.map((pawn) => {
      if (pawn.side === side) return pawn
      const foe = pawn.clone()
      foe.escapeChance = 0
      return foe
    }),
  }
}

const strike = (target: Pawn): Action[] => [{ type: 'attack', q: target.q, r: target.r }]

test('Each escape roll keeps its own odds across a multi-attack turn', () => {
  const king = new King(2, 1, 0, 'player', 6, 3, 20)
  const state = battle([new Swordsman(1, 0, 0, 'enemy'), king, new King(3, -6, 0, 'enemy')])
  const actions = [...strike(king), ...strike(king), ...strike(king)]
  const outcomes = turnOutcomes(state, { actions, state })
  const total = outcomes.reduce((sum, outcome) => sum + outcome.weight, 0)
  const victory = outcomes
    .filter((outcome) => outcome.state.winner === 'enemy')
    .reduce((sum, outcome) => sum + outcome.weight, 0)
  assert.ok(Math.abs(total - 1) < 1e-9)
  assert.ok(Math.abs(victory - 0.8 ** 3) < 1e-9)
})

test('A turn that starts a new round keeps the reset escape chances', () => {
  const state = battle(
    [
      new King(1, 3, 0, 'player', 7, 3, 60),
      new Swordsman(2, 0, 0, 'enemy'),
      new King(3, -6, 0, 'enemy'),
    ],
    [1, 3, 2],
    2,
  )
  const plan = turnPlans(allHitWorld(state)).find((p) => p.actions.length === 1)!
  assert.deepEqual(plan.actions, [{ type: 'endTurn' }])
  const [outcome] = turnOutcomes(state, plan)
  assert.equal(outcome.state.round, state.round + 1)
  assert.equal(outcome.state.pawns.find((p) => p.id === 1)!.escapeChance, 0)
})

test('A dodged winning blow still finishes the turn before the next ply', () => {
  const king = new King(2, 1, 0, 'player', 2, 3, 40)
  const state = battle([new Swordsman(1, 0, 0, 'enemy'), king, new King(3, -6, 0, 'enemy')])
  const outcomes = turnOutcomes(state, { actions: strike(king), state })
  assert.equal(outcomes.length, 2)
  for (const { state: next } of outcomes)
    assert.ok(next.winner || activePawn(next)?.id !== 1, 'The swordsman is still acting')
})

test('Turn plans keep equal positions that saved different escape chances', () => {
  const state = battle([
    new Ninja(1, 0, 0, 'enemy'),
    new King(2, -6, 0, 'enemy'),
    new King(3, 6, 0, 'player'),
  ])
  const escapes = turnPlans(state)
    .map((plan) => plan.state.pawns.find((p) => p.id === 1)!)
    .filter((ninja) => ninja.q === 1 && ninja.r === 0)
    .map((ninja) => ninja.escapeChance)
  assert.ok(escapes.includes(0) && escapes.includes(40), 'Escapes found: ' + escapes.join(', '))
})

test('A rune-boosted attacker facing many targets plans and decides quickly', () => {
  const bulwarks = [
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
    [6, 3],
    [2, 4],
  ].map(([col, row], index) => {
    const { q, r } = hexOf(col, row)
    return new Bulwark(10 + index, q, r, 'player')
  })
  const archer = hexOf(4, 5)
  const state = battle([
    new Archer(1, archer.q, archer.r, 'enemy', undefined, 5),
    new King(2, -6, 0, 'enemy'),
    new King(3, 6, 6, 'player'),
    ...bulwarks,
  ])
  const started = performance.now()
  const plans = turnPlans(state)
  assert.ok(performance.now() - started < 1000, 'Enumeration took too long')
  assert.ok(plans.every((plan) => plan.actions.filter((a) => a.type === 'attack').length <= 3))
  const actions = chooseBotActions(state, { name: 'depthsearch', difficulty: 'hard' })
  assert.notEqual(actions.reduce(reducer, state), state)
})
