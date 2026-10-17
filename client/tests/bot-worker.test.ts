import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { getBrowserBot } from '../src/bots/worker.ts'
import { DEFAULT_BOT_CONFIG, getBot } from '../src/bots/catalog.ts'
import { King, Swordsman } from '../src/lib/engine/index.ts'
import { field } from './field.ts'

function replaceWorker(t: TestContext, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker')
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value })
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'Worker', descriptor)
    else Reflect.deleteProperty(globalThis, 'Worker')
  })
}

const state = () =>
  field([
    new Swordsman(1, 0, 0, 'enemy'),
    new King(2, 1, 0, 'player'),
    new King(3, -1, 0, 'enemy'),
  ])

test('browser bots still choose their moves when Worker is unavailable or blocked', async (t) => {
  const expected = await getBot(DEFAULT_BOT_CONFIG).chooseActions(state())
  assert.ok(expected.some((action) => action.type !== 'endTurn'))
  for (const Worker of [
    undefined,
    class {
      constructor() {
        throw new DOMException('Workers blocked', 'SecurityError')
      }
    },
  ]) {
    replaceWorker(t, Worker)
    assert.deepEqual(await getBrowserBot(DEFAULT_BOT_CONFIG).chooseActions(state()), expected)
  }
})

test('worker loading failures run the bot locally and terminate the failed worker', async (t) => {
  let terminated = false
  let prevented = false
  replaceWorker(
    t,
    class {
      onerror?: (event: { message: string; preventDefault(): void }) => void
      postMessage() {
        queueMicrotask(() =>
          this.onerror?.({
            message: 'Worker asset unavailable',
            preventDefault: () => {
              prevented = true
            },
          }),
        )
      }
      terminate() {
        terminated = true
      }
    },
  )
  assert.deepEqual(
    await getBrowserBot(DEFAULT_BOT_CONFIG).chooseActions(state()),
    await getBot(DEFAULT_BOT_CONFIG).chooseActions(state()),
  )
  assert.ok(terminated)
  assert.ok(prevented)
})

test('cancelling a failed worker before fallback discards its decision', async (t) => {
  replaceWorker(t, undefined)
  const bot = getBrowserBot(DEFAULT_BOT_CONFIG)
  const decision = bot.chooseActions(state())
  bot.cancel()
  assert.deepEqual(await decision, [])
})

test('worker restoration or search errors run the same bot locally', async (t) => {
  replaceWorker(
    t,
    class {
      onmessage?: (event: { data: { error: string } }) => void
      postMessage() {
        queueMicrotask(() => this.onmessage?.({ data: { error: 'Unreadable bot state' } }))
      }
      terminate() {}
    },
  )
  assert.deepEqual(
    await getBrowserBot(DEFAULT_BOT_CONFIG).chooseActions(state()),
    await getBot(DEFAULT_BOT_CONFIG).chooseActions(state()),
  )
})
