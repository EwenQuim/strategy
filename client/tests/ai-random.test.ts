import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialState, reducer, type GameState } from '../src/lib/engine/index.ts'
import { STRATEGIES } from '../src/lib/engine/ai/decision.ts'

async function randomBattle(seed: string): Promise<GameState> {
  let state = initialState(seed)
  for (let decisions = 0; !state.winner && decisions < 5000; decisions++)
    for (const action of await STRATEGIES.random(state)) {
      const next = reducer(state, action)
      assert.notEqual(next, state, `illegal ${JSON.stringify(action)}`)
      state = next
    }
  return state
}

test('The random strategy plays whole battles with legal actions, deterministically', async () => {
  const battle = await randomBattle('random-ai')
  assert.ok(battle.winner)
  assert.deepEqual((await randomBattle('random-ai')).log, battle.log)
})
