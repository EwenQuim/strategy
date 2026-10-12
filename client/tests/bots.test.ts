import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BOTS,
  DEFAULT_BOT_CONFIG,
  getBot,
  parseBotConfig,
  type BotConfig,
} from '../src/bots/catalog.ts'
import { withFallback, type Bot } from '../src/bots/bot.ts'
import {
  MISTRAL_KEY_STORAGE as mistralKey,
  JEV_KEY_STORAGE as jevKey,
} from '../src/bots/apiKeys.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { activePawn, initialState, reducer } from '../src/lib/engine/index.ts'
import { legalActions } from '../src/lib/engine/ai/options.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { MistralBot } from '../src/bots/strategies/mistral.ts'
import {
  BATTLE_SNAPSHOT_VERSION,
  battleIdentity,
  isSameBattle,
  snapshotState,
} from '../src/lib/battleSnapshot.ts'
import { readBattleFromLocalStorage } from '../src/battleStorage.ts'
import { parseGameSearch } from '../src/lib/game-mode.ts'

const storage = { getItem: (_key: string): string | null => null }
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })

function enemyTurn() {
  let state = initialState('registered-bots')
  while (activePawn(state)?.side !== 'enemy') state = reducer(state, { type: 'endTurn' })
  return state
}

test('Serializable bot descriptions resolve independently with their own names and options', () => {
  const configs: BotConfig[] = [
    { name: 'depthsearch', options: BOT_LEVELS.easy },
    { name: 'depthsearch', options: BOT_LEVELS.normal },
    { name: 'depthsearch', options: BOT_LEVELS.hard },
    BOTS.random.defaultConfig,
    BOTS.mistral.defaultConfig,
    BOTS.jev.defaultConfig,
  ]
  for (const config of configs) {
    const restored = JSON.parse(JSON.stringify(config)) as BotConfig
    const bot = getBot(restored)
    assert.equal(bot.name, config.name)
    assert.deepEqual(bot.options, config.options)
    const other = getBot(config)
    assert.notEqual(other, bot)
    assert.deepEqual(other.options, bot.options)
    assert.deepEqual(parseBotConfig(parseGameSearch({ bot: config }).bot), config)
  }
  assert.notEqual(getBot(configs[0]), getBot(configs[1]))
  assert.notEqual(getBot(configs[1]), getBot(configs[2]))
})

test('Fallback preserves the remote identity and calls methods on their owning objects', async () => {
  const state = enemyTurn()
  const primary: Bot = {
    name: 'remote',
    options: { effort: 'high' },
    async chooseActions() {
      assert.equal(this, primary)
      throw new Error('offline')
    },
  }
  const fallback: Bot = {
    name: 'local',
    options: {},
    async chooseActions() {
      assert.equal(this, fallback)
      return [{ type: 'endTurn' }]
    },
  }
  const bot = withFallback(primary, fallback)
  assert.equal(bot.name, 'remote')
  assert.equal(bot.options, primary.options)
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

    assert.deepEqual(await getBot(BOTS[name].defaultConfig).chooseActions(state), [action])
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
    assert.deepEqual(await getBot(BOTS[name].defaultConfig).chooseActions(state), fallback)
    assert.equal(request.mock.callCount(), 0)
  })
}

test('Arbitrary search options and Mistral effort use the same config, URL and save path', () => {
  const configs: BotConfig[] = [
    { name: 'depthsearch', options: { ...BOT_LEVELS.hard, beamWidth: 7, latitude: 12 } },
    { name: 'mistral', options: new MistralBot({ effort: 'high', temperature: 0.7 }).options },
  ]
  for (const config of configs) {
    const json = JSON.parse(JSON.stringify({ bot: config }))
    const restored = parseBotConfig(parseGameSearch(json).bot)
    assert.deepEqual(restored, config)
    assert.deepEqual(getBot(restored).options, config.options)
    const identity = battleIdentity('ai', 'same-seed', config, undefined)
    assert.ok(isSameBattle(identity, battleIdentity('ai', 'same-seed', restored, undefined)))
    assert.ok(
      !isSameBattle(
        identity,
        battleIdentity('ai', 'same-seed', BOTS[config.name].defaultConfig, undefined),
      ),
    )
  }
})

test('Unknown, malformed and out-of-range bot options cannot reach a strategy', () => {
  for (const config of [
    null,
    { name: 'toString', options: {} },
    { name: 'depthsearch', options: { depth: 0 } },
    { name: 'depthsearch', options: { beamWidth: '7' } },
    { name: 'depthsearch', options: { latitude: 1000 } },
    { name: 'mistral', options: { effort: 'extreme' } },
    { name: 'mistral', options: { maxTokens: -1 } },
    { name: 'mistral', options: { temperature: NaN } },
    { name: 'random', options: { effort: 'high' } },
    { name: 'jev', options: { model: '' } },
  ])
    assert.deepEqual(parseBotConfig(config), DEFAULT_BOT_CONFIG)
})

test('Option key order does not change bot identity or decisions', async () => {
  const config: BotConfig = {
    name: 'depthsearch',
    options: { ...BOT_LEVELS.hard, beamWidth: 7 },
  }
  const bot = getBot(config)
  const reordered = {
    name: config.name,
    options: Object.fromEntries(Object.entries(config.options).reverse()),
  }
  assert.deepEqual(parseBotConfig(reordered), config)
  const state = enemyTurn()
  assert.deepEqual(
    await getBot(parseBotConfig(reordered)).chooseActions(state),
    await bot.chooseActions(state),
  )
})

test('An offline battle resumes only with the same normalized bot options', (t) => {
  const state = enemyTurn()
  const config: BotConfig = { name: 'depthsearch', options: BOT_LEVELS.hard }
  const saved = {
    version: BATTLE_SNAPSHOT_VERSION,
    identity: battleIdentity('ai', state.seed, config, undefined),
    state: snapshotState(state),
  }
  t.mock.method(storage, 'getItem', () => JSON.stringify(saved))
  assert.deepEqual(readBattleFromLocalStorage('ai', state.seed, config, undefined), state)
  assert.equal(
    readBattleFromLocalStorage('ai', state.seed, DEFAULT_BOT_CONFIG, undefined),
    null,
  )
  const reordered = parseBotConfig({
    name: config.name,
    options: Object.fromEntries(Object.entries(config.options).reverse()),
  })
  assert.deepEqual(readBattleFromLocalStorage('ai', state.seed, reordered, undefined), state)
  const remote: BotConfig = {
    name: 'mistral',
    options: new MistralBot({ effort: 'high' }).options,
  }
  saved.identity = battleIdentity('ai', state.seed, remote, undefined)
  assert.deepEqual(readBattleFromLocalStorage('ai', state.seed, remote, undefined), state)
  assert.equal(
    readBattleFromLocalStorage('ai', state.seed, BOTS.mistral.defaultConfig, undefined),
    null,
  )
})

test('Mistral effort and other constructor options reach the API after a URL round trip', async (t) => {
  const config: BotConfig = {
    name: 'mistral',
    options: new MistralBot({
      effort: 'high',
      maxTokens: 2048,
      temperature: 0.7,
    }).options,
  }
  t.mock.method(storage, 'getItem', (key: string) =>
    key === mistralKey ? 'test-api-key' : null,
  )
  const request = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      id: 'test',
      object: 'chat.completion',
      created: 0,
      model: config.options.model,
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: { role: 'assistant', content: '{"type":"endTurn"}' },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  )
  const restored = parseBotConfig(
    parseGameSearch(JSON.parse(JSON.stringify({ bot: config }))).bot,
  )
  assert.deepEqual(await getBot(restored).chooseActions(enemyTurn()), [{ type: 'endTurn' }])
  const [input] = request.mock.calls[0].arguments
  assert.ok(input instanceof Request)
  const body = await input.json()
  assert.equal(body.reasoning_effort, 'high')
  assert.equal(body.max_tokens, 2048)
  assert.equal(body.temperature, 0.7)
  assert.equal(body.model, config.options.model)
})
