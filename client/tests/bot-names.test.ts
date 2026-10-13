import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BOTS, DEFAULT_BOT_CONFIG, parseBotConfig } from '../src/bots/catalog.ts'
import { readBattleFromLocalStorage } from '../src/battleStorage.ts'
import {
  BATTLE_SNAPSHOT_VERSION,
  battleIdentity,
  snapshotState,
} from '../src/lib/battleSnapshot.ts'
import { initialState } from '../src/lib/engine/index.ts'

test('Selectable bots display generals while unrelated strategy IDs stay unchanged', async (context) => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages: ['en'] },
  })
  context.after(() => {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    else Reflect.deleteProperty(globalThis, 'navigator')
  })
  const m = await import('../src/i18n/menus.ts')
  assert.deepEqual(m.aiStrategies, {
    napoleon: 'Napoleon',
    hannibal: 'Hannibal',
    depthsearch: 'Sun Tzu',
    random: 'Pyrrhus',
    mistral: 'Alexander',
    jev: 'Scipio',
  })
  assert.deepEqual(Object.keys(BOTS).sort(), Object.keys(m.aiStrategies).sort())
})

test('Legacy bot configs retain every option and serialize with the new IDs', () => {
  for (const [legacy, name] of [
    ['commander', 'napoleon'],
    ['learned', 'hannibal'],
  ] as const) {
    for (const options of Object.values(BOTS[name].presets)) {
      const parsed = parseBotConfig({ name: legacy, options })
      assert.deepEqual(parsed, { name, options })
      assert.deepEqual(parseBotConfig(JSON.parse(JSON.stringify(parsed))), parsed)
    }
  }
  assert.equal(
    parseBotConfig({ name: 'learned', options: { simulations: 0 } }),
    DEFAULT_BOT_CONFIG,
  )
})

test('Legacy saved battles resume only with the same bot options and battle identity', (context) => {
  for (const [legacy, name] of [
    ['commander', 'napoleon'],
    ['learned', 'hannibal'],
  ] as const) {
    const bot = BOTS[name].defaultConfig
    const state = initialState('legacy-bot-save')
    const saved = JSON.stringify({
      version: BATTLE_SNAPSHOT_VERSION,
      identity: battleIdentity('ai', 'legacy-bot-save', { ...bot, name: legacy }, undefined),
      state: snapshotState(state),
    })
    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => saved },
    })
    context.after(() => {
      if (storageDescriptor)
        Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    })
    const restored = readBattleFromLocalStorage('ai', 'legacy-bot-save', bot, undefined)
    assert.ok(restored)
    assert.deepEqual(snapshotState(restored), snapshotState(state))
    assert.equal(readBattleFromLocalStorage('ai', 'different-seed', bot, undefined), null)
    assert.equal(
      readBattleFromLocalStorage('ai', 'legacy-bot-save', BOTS.random.defaultConfig, undefined),
      null,
    )
    assert.equal(
      readBattleFromLocalStorage(
        'ai',
        'legacy-bot-save',
        { name, options: BOTS[name].presets.brutal } as typeof bot,
        undefined,
      ),
      null,
    )
  }
})
