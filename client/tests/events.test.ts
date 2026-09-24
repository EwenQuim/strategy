import assert from 'node:assert/strict'
import { test } from 'node:test'
import { watchOnlineGame } from '../src/api/events.ts'

test('SSE heartbeats, stalled streams, terminal errors, resume, and cleanup', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const sources: FakeEventSource[] = []
  class FakeEventSource extends EventTarget {
    static CLOSED = 2
    readyState = 1
    url: string
    onmessage: ((event: MessageEvent) => void) | null = null
    onopen: (() => void) | null = null
    onerror: (() => void) | null = null

    constructor(url: string) {
      super()
      this.url = url
      sources.push(this)
    }

    close() {
      this.readyState = FakeEventSource.CLOSED
    }
  }

  let stop: (() => void) | undefined
  t.after(() => stop?.())
  const window = new EventTarget()
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  for (const [key, value] of Object.entries({
    EventSource: FakeEventSource,
    window,
    document,
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    })
  }

  const snapshots: string[] = []
  stop = watchOnlineGame('AB3F9K', (game) => snapshots.push(game))
  assert.equal(sources.length, 1)
  assert.equal(sources[0].url, '/api/games/AB3F9K/events')
  sources[0].onopen?.()
  const game = { code: 'AB3F9K', version: 0, actions: [] }
  sources[0].onmessage?.(new MessageEvent('message', { data: JSON.stringify(game) }))
  assert.deepEqual(snapshots, [JSON.stringify(game)])

  for (let beat = 0; beat < 5; beat++) {
    t.mock.timers.tick(15_000)
    sources[0].dispatchEvent(new Event('heartbeat'))
  }
  assert.equal(sources.length, 1, 'Healthy streams should stay open')
  sources[0].readyState = 0
  sources[0].onerror?.()
  t.mock.timers.tick(2000)
  assert.equal(sources.length, 1, 'Native EventSource owns ordinary retries')
  t.mock.timers.tick(43_000)
  assert.equal(sources.length, 2, 'Silent stalls must open a fresh connection')
  assert.equal(sources[0].readyState, FakeEventSource.CLOSED)
  sources[1].onmessage?.(new MessageEvent('message', { data: JSON.stringify(game) }))
  assert.equal(snapshots.length, 2, 'Reconnect snapshots arrive even at the same version')

  sources[1].readyState = FakeEventSource.CLOSED
  sources[1].onerror?.()
  t.mock.timers.tick(1999)
  assert.equal(sources.length, 2)
  t.mock.timers.tick(1)
  assert.equal(sources.length, 3, 'Terminal HTTP errors also retry')

  window.dispatchEvent(new Event('online'))
  assert.equal(sources.length, 4)
  assert.equal(sources[2].readyState, FakeEventSource.CLOSED)
  document.visibilityState = 'hidden'
  document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(sources.length, 4)
  document.visibilityState = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(sources.length, 5)
  assert.equal(sources[3].readyState, FakeEventSource.CLOSED)

  stop()
  assert.equal(sources[4].readyState, FakeEventSource.CLOSED)
  window.dispatchEvent(new Event('online'))
  document.dispatchEvent(new Event('visibilitychange'))
  t.mock.timers.tick(90_000)
  assert.equal(sources.length, 5, 'Unmount must remove listeners and timers')
})
