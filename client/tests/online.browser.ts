import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer, type ServerResponse } from 'node:http'
import { extname } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { test } from 'node:test'
import { chromium } from 'playwright-core'
import { activePawn } from '../src/lib/engine/index.ts'
import { replay } from '../src/lib/playback.ts'
import type { OnlineGame } from '../src/lib/online.ts'

const timeout = 10_000

test(
  'Online SSE reconnects, catches up, and rolls back rejected moves without polling',
  { timeout: 40_000 },
  async (t) => {
    const game: OnlineGame = {
      code: 'AB3F9K',
      seed: 'online-seed-1',
      status: 'waiting',
      version: 0,
      namePlayer: 'Ewen',
      nameEnemy: '',
      winner: null,
      actions: [],
    }
    const streams = new Set<ServerResponse>()
    let connections = 0
    let gets = 0
    let rejectMoves = false
    let unavailableOnce = false
    const snapshot = () => 'retry: 2000\ndata: ' + JSON.stringify(game) + '\n\n'
    const broadcast = () => {
      for (const stream of streams) stream.write(snapshot())
    }
    const endTurn = () => {
      const pawn = activePawn(replay(game.seed, game.actions))!
      game.actions.push({ side: pawn.side, action: { type: 'endTurn' } })
      game.version++
    }
    const server = createServer(async (request, response) => {
      const path = new URL(request.url!, 'http://localhost').pathname
      if (path === '/api/games/' + game.code + '/events') {
        connections++
        if (unavailableOnce) {
          unavailableOnce = false
          response.writeHead(503).end()
          return
        }
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.write(snapshot())
        streams.add(response)
        response.on('close', () => streams.delete(response))
      } else if (path === '/api/games/' + game.code + '/actions') {
        const chunks = []
        for await (const chunk of request) chunks.push(chunk)
        const body = JSON.parse(Buffer.concat(chunks).toString())
        if (rejectMoves || body.version !== game.version) {
          response.writeHead(409).end('{}')
          return
        }
        endTurn()
        broadcast()
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ version: game.version }))
      } else if (path === '/api/games/' + game.code) {
        gets++
        response.writeHead(rejectMoves ? 503 : 200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(game))
      } else {
        const file = path.startsWith('/strategy/assets/')
          ? path.slice('/strategy/'.length)
          : 'index.html'
        const mime =
          extname(file) === '.js'
            ? 'text/javascript'
            : extname(file) === '.css'
              ? 'text/css'
              : 'text/html'
        response.setHeader('Content-Type', mime)
        response.end(await readFile(new URL('../dist/' + file, import.meta.url)))
      }
    })
    t.after(async () => {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      timeout: 30_000,
    })
    t.after(() => browser.close())
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      serviceWorkers: 'block',
    })
    const page = await context.newPage()
    page.setDefaultTimeout(timeout)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const side = activePawn(replay(game.seed, []))!.side
    await page.addInitScript(
      (stored) => {
        localStorage.setItem('hexmate.online.games', JSON.stringify([stored]))
      },
      { code: game.code, token: 'secret', side },
    )
    const connected = page.waitForResponse((response) => response.url().endsWith('/events'))
    await page.goto('http://127.0.0.1:' + address.port + '/strategy/online/' + game.code)
    await page.getByRole('heading', { name: 'Waiting for an opponent' }).waitFor()
    await connected
    assert.equal(streams.size, 1)
    game.status = 'active'
    game.nameEnemy = 'Bob'
    broadcast()
    await page.getByTestId('game-header').waitFor()
    assert.equal(connections, 1, 'The route and game must share one stream')

    const waitForState = async () => {
      const active = replay(game.seed, game.actions).active
      await page.waitForFunction(
        (expected) =>
          document.querySelectorAll('[data-testid="initiative-unit"][data-acted="true"]')
            .length === expected,
        active,
        { timeout },
      )
    }
    await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/actions')),
      page.getByRole('button', { name: /End turn/ }).click(),
    ])
    await waitForState()
    assert.equal(game.version, 1)
    assert.equal(gets, 1, 'SSE snapshots should not fetch the game again')

    endTurn()
    unavailableOnce = true
    for (const stream of streams) stream.destroy()
    await waitForState()
    assert.ok(connections >= 3, 'Both dropped streams and HTTP 503 must reconnect')
    assert.equal(streams.size, 1)
    assert.equal(gets, 1)

    while (activePawn(replay(game.seed, game.actions))!.side !== side) endTurn()
    broadcast()
    await waitForState()
    rejectMoves = true
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().endsWith('/' + game.code) && response.status() === 503,
      ),
      page.getByRole('button', { name: /End turn/ }).click(),
    ])
    rejectMoves = false
    const reconnected = page.waitForResponse((response) => response.url().endsWith('/events'))
    for (const stream of streams) stream.end()
    await reconnected
    await waitForState()
    assert.equal(streams.size, 1, 'Same-version reconnect must repair the optimistic move')

    const beforeIdle = gets
    await setTimeout(2200)
    assert.equal(gets, beforeIdle, 'Idle games must not poll')
    assert.deepEqual(errors, [])
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight > innerHeight),
      false,
    )
    await page.getByRole('link', { name: 'Online lobby', exact: true }).click()
    await page.getByRole('heading', { name: 'Online play', exact: true }).waitFor()
    await setTimeout(100)
    assert.equal(streams.size, 0, 'Leaving the battle must close the stream')
  },
)
