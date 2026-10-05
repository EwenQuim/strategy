import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activePawn, initialState, reducer, type GameState } from '../src/lib/engine/index.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { chooseAiActions } from '../src/lib/engine/ai/decision.ts'
import { legalActions } from '../src/lib/engine/ai/options.ts'
import { actionFromReply, battlePrompt } from '../src/lib/engine/ai/strategies/mistral.ts'
import { mistralChooseAction } from '../src/api/mistralBot.ts'

function enemyTurn(seed: string): GameState {
  let state = initialState(seed)
  for (let turns = 0; turns < 12 && activePawn(state)?.side !== 'enemy'; turns++)
    state = reducer(state, { type: 'endTurn' })
  const pawn = activePawn(state)
  assert.ok(pawn && pawn.side === 'enemy', 'no enemy turn found in this seed')
  return state
}

test('The battle prompt carries the whole position and every legal action', () => {
  const state = enemyTurn('mistral-prompt')
  const prompt = battlePrompt(state)
  assert.ok(prompt.includes(`Round ${state.round}`))
  assert.ok(prompt.includes('Active unit'))
  for (const pawn of state.pawns)
    assert.ok(prompt.includes(`(${pawn.q},${pawn.r})`), `missing pawn at ${pawn.q},${pawn.r}`)
  for (const action of legalActions(state))
    assert.ok(
      prompt.includes(JSON.stringify(action)),
      `missing legal action ${JSON.stringify(action)}`,
    )
})

test('A model reply is accepted only when the engine accepts the action', () => {
  const state = enemyTurn('mistral-reply')
  const legal = legalActions(state)
  const reply = 'Sure, my move: ' + JSON.stringify(legal[0]) + ' — good luck.'
  assert.deepEqual(actionFromReply(reply, state), legal[0])
  assert.equal(actionFromReply('{"type":"restart"}', state), null)
  assert.equal(actionFromReply('I surrender.', state), null)
  assert.equal(actionFromReply('{"type":"move","q":99,"r":99}', state), null)
})

test('Without the adapter the mistral strategy falls back to the local search', () => {
  const state = enemyTurn('mistral-sync')
  const actions = chooseAiActions(state, BOT_LEVELS.normal, 'mistral')
  assert.ok(actions.length > 0)
  for (const action of actions)
    assert.notEqual(reducer(state, action), state, `illegal ${JSON.stringify(action)}`)
})

test('Without an API key the adapter falls back to a legal local action', async () => {
  const state = enemyTurn('mistral-fallback')
  const action = await mistralChooseAction(state, BOT_LEVELS.normal)
  assert.notEqual(reducer(state, action), state)
})
