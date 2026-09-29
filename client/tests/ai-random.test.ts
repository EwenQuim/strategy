import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialState, reducer, type GameState } from '../src/lib/engine/index.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { chooseAiActions } from '../src/lib/engine/ai/decision.ts'

function randomBattle(seed: string): GameState {
  let state = initialState(seed)
  for (let decisions = 0; !state.winner && decisions < 5000; decisions++)
    for (const action of chooseAiActions(state, BOT_LEVELS.normal, 'random')) {
      const next = reducer(state, action)
      assert.notEqual(next, state, `illegal ${JSON.stringify(action)}`)
      state = next
    }
  return state
}

test('The random strategy plays whole battles with legal actions, deterministically', () => {
  const battle = randomBattle('random-ai')
  assert.ok(battle.winner)
  assert.deepEqual(randomBattle('random-ai').log, battle.log)
})
