import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activePawn, initialState, reducer, type GameState } from '../src/lib/engine/index.ts'
import { legalActions } from '../src/lib/engine/ai/options.ts'
import { actionCriteria, actionFromChoice, jevChooseAction } from '../src/api/jevBot.ts'

function enemyTurn(seed: string): GameState {
  let state = initialState(seed)
  for (let turns = 0; turns < 12 && activePawn(state)?.side !== 'enemy'; turns++)
    state = reducer(state, { type: 'endTurn' })
  const pawn = activePawn(state)
  assert.ok(pawn && pawn.side === 'enemy', 'no enemy turn found in this seed')
  return state
}

test('The Jev criteria list every legal action exactly once', () => {
  const state = enemyTurn('jev-criteria')
  const legal = legalActions(state)
  const criteria = actionCriteria(state)
  assert.deepEqual(
    Object.keys(criteria),
    legal.map((_, index) => String(index)),
  )
  legal.forEach((action, index) => {
    const entry = criteria[String(index)]
    assert.ok(entry.length > 0, `empty criteria for ${JSON.stringify(action)}`)
    if (action.type === 'move')
      assert.ok(
        entry.includes(`(${action.q},${action.r})`),
        `missing destination in "${entry}"`,
      )
  })
  assert.ok(
    Object.values(criteria).some((entry) => entry.includes('losing the remaining energy')),
    'the endTurn option must warn that energy is lost',
  )
})

test("Jev's chosen key maps to an action only when the engine accepts it", () => {
  const state = enemyTurn('jev-choice')
  const legal = legalActions(state)
  assert.deepEqual(actionFromChoice('0', state), legal[0])
  assert.deepEqual(actionFromChoice(String(legal.length - 1), state), legal[legal.length - 1])
  assert.equal(actionFromChoice(String(legal.length), state), null)
  assert.equal(actionFromChoice('x', state), null)
  assert.equal(actionFromChoice(null, state), null)
})

test('Without an API key the adapter falls back to a legal local action', async () => {
  const state = enemyTurn('jev-fallback')
  const action = await jevChooseAction(state)
  assert.notEqual(reducer(state, action), state)
})
