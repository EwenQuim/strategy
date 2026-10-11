import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBot, botFromSearch, searchFromBot } from '../src/bots.ts'
import { API_KEY_STORAGE as mistralKey } from '../src/api/mistralBot.ts'
import { API_KEY_STORAGE as jevKey } from '../src/api/jevBot.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { activePawn, initialState, reducer } from '../src/lib/engine/index.ts'
import { legalActions } from '../src/lib/engine/ai/options.ts'
import { depthsearch } from '../src/lib/bots/depthsearch.ts'
import { parseGameSearch } from '../src/lib/game-mode.ts'

const storage = { getItem: (_key: string): string | null => null }
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })

function enemyTurn() {
  let state = initialState('registered-bots')
  while (activePawn(state)?.side !== 'enemy') state = reducer(state, { type: 'endTurn' })
  return state
}

for (const [name, storageKey, endpoint] of [
  ['mistral', mistralKey, 'https://api.mistral.ai/v1/chat/completions'],
  ['jev', jevKey, 'https://api.typesafe.ai/v1/systemone'],
] as const) {
  test(`The registered ${name} bot plays the remote reply`, async (t) => {
    const state = enemyTurn()
    const action = { type: 'endTurn' } as const
    const choice = legalActions(state).findIndex((candidate) => candidate.type === 'endTurn')
    assert.ok(choice >= 0)
    t.mock.method(storage, 'getItem', (key: string) =>
      key === storageKey ? 'test-api-key' : null,
    )
    const request = t.mock.method(globalThis, 'fetch', async () =>
      Response.json(
        name === 'jev'
          ? { answers: { move: { choice: String(choice) } } }
          : {
              id: 'test-completion',
              object: 'chat.completion',
              created: 0,
              model: 'test-model',
              choices: [
                {
                  index: 0,
                  finish_reason: 'stop',
                  message: { role: 'assistant', content: JSON.stringify(action) },
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            },
      ),
    )

    assert.deepEqual(await createBot({ name })(state), [action])
    assert.equal(request.mock.callCount(), 1)
    const [input] = request.mock.calls[0].arguments
    assert.equal(input instanceof Request ? input.url : String(input), endpoint)
    assert.notEqual(reducer(state, action), state)
  })

  test(`The registered ${name} bot falls back locally without a key`, async (t) => {
    const state = enemyTurn()
    const request = t.mock.method(globalThis, 'fetch', async () => {
      throw new Error('No network request expected without a key')
    })
    const fallback = await depthsearch(BOT_LEVELS.normal)(state)
    assert.deepEqual(await createBot({ name })(state), fallback)
    assert.equal(request.mock.callCount(), 0)
  })

  test(`${name} remains selectable through a shared battle URL`, () => {
    const search = parseGameSearch({ strategy: name })
    assert.equal(search.strategy, name)
    assert.deepEqual(searchFromBot(botFromSearch(search)), { strategy: name })
  })
}
