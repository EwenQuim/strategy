import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getBot, botFromSearch, searchFromBot, type BotConfig } from '../src/bots/catalog.ts'
import { withFallback, type Bot } from '../src/bots/bot.ts'
import {
  MISTRAL_KEY_STORAGE as mistralKey,
  JEV_KEY_STORAGE as jevKey,
} from '../src/bots/apiKeys.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { activePawn, initialState, reducer } from '../src/lib/engine/index.ts'
import { legalActions } from '../src/lib/engine/ai/options.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { parseGameSearch } from '../src/lib/game-mode.ts'

const storage = { getItem: (_key: string): string | null => null }
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })

function enemyTurn() {
  let state = initialState('registered-bots')
  while (activePawn(state)?.side !== 'enemy') state = reducer(state, { type: 'endTurn' })
  return state
}

test('Serializable bot descriptions resolve to stable objects with their own names', () => {
  const configs: BotConfig[] = [
    { name: 'depthsearch', difficulty: 'easy' },
    { name: 'depthsearch', difficulty: 'normal' },
    { name: 'depthsearch', difficulty: 'hard' },
    { name: 'random' },
    { name: 'mistral' },
    { name: 'jev' },
  ]
  for (const config of configs) {
    const restored = JSON.parse(JSON.stringify(config)) as BotConfig
    const bot = getBot(restored)
    assert.equal(bot.name, config.name)
    assert.equal(getBot(config), bot)
    assert.deepEqual(botFromSearch(parseGameSearch(searchFromBot(config))), config)
  }
  assert.notEqual(getBot(configs[0]), getBot(configs[1]))
  assert.notEqual(getBot(configs[1]), getBot(configs[2]))
})

test('Fallback preserves the remote identity and calls methods on their owning objects', async () => {
  const state = enemyTurn()
  const primary: Bot = {
    name: 'remote',
    async chooseActions() {
      assert.equal(this, primary)
      throw new Error('offline')
    },
  }
  const fallback: Bot = {
    name: 'local',
    async chooseActions() {
      assert.equal(this, fallback)
      return [{ type: 'endTurn' }]
    },
  }
  const bot = withFallback(primary, fallback)
  assert.equal(bot.name, 'remote')
  assert.deepEqual(await bot.chooseActions(state), [{ type: 'endTurn' }])
})

test('A search bot keeps its own options when the caller changes its configuration', async () => {
  const state = enemyTurn()
  const options = { ...BOT_LEVELS.normal }
  const bot = new DepthsearchBot(options)
  const expected = await bot.chooseActions(state)
  Object.assign(options, { beamWidth: 0, riskAppetite: NaN })
  assert.notEqual(bot.options, options)
  assert.deepEqual(bot.options, BOT_LEVELS.normal)
  assert.deepEqual(await bot.chooseActions(state), expected)
})

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

    assert.deepEqual(await getBot({ name }).chooseActions(state), [action])
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
    const fallback = await new DepthsearchBot(BOT_LEVELS.normal).chooseActions(state)
    assert.deepEqual(await getBot({ name }).chooseActions(state), fallback)
    assert.equal(request.mock.callCount(), 0)
  })

  test(`${name} remains selectable through a shared battle URL`, () => {
    const search = parseGameSearch({ strategy: name })
    assert.equal(search.strategy, name)
    assert.deepEqual(searchFromBot(botFromSearch(search)), { strategy: name })
  })
}
