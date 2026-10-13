import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, test, type TestContext } from 'node:test'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'
import { King, Swordsman } from '../src/lib/engine/index.ts'
import { field } from './field.ts'
import {
  battleIdentity,
  BATTLE_SNAPSHOT_VERSION,
  snapshotState,
} from '../src/lib/battleSnapshot.ts'
import { DEFAULT_BOT_CONFIG } from '../src/bots/catalog.ts'

// A tap must not re-render the whole board: memo on HexTile is what skips
// untouched tiles, and engine actions and playback frames re-create every tile
// and pawn, so a regression (identity-based comparisons, a dropped prop
// primitive) silently returns to full-board renders. Timing metrics cannot see
// it; the render counter can. Budgets sit well above the measured counts so
// only real regressions fail, and moving one is a reviewed decision.
const INSPECT_TAP_BUDGET = 80
const MOVE_TAP_BUDGET = 50

const base = '/strategy/'
const mime: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

let sharedBrowser: Promise<Browser> | undefined

after(async () => (await sharedBrowser)?.close())

// The render counter is compiled out of production builds, so the gate builds
// its own bundle with the flag on. The output stays outside dist: the PWA
// tests assert the precache manifest covers every file under dist.
function buildCounterDist() {
  execFileSync(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'build', '--outDir', 'dist-tile-counter'],
    {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, VITE_TILE_RENDER_COUNTER: '1' },
      stdio: 'inherit',
    },
  )
  return fileURLToPath(new URL('../dist-tile-counter/', import.meta.url))
}

async function fixture(t: TestContext) {
  const dist = buildCounterDist()
  const server = createServer(async (request, response) => {
    const path = new URL(request.url!, 'http://127.0.0.1').pathname
    const navigation = path.startsWith(base) && request.headers.accept?.includes('text/html')
    const file = join(dist, navigation ? 'index.html' : path.slice(base.length))
    try {
      const content = await readFile(file)
      response.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      response.end(content)
    } catch {
      response.writeHead(404).end()
    }
  })
  let context: BrowserContext | undefined
  t.after(async () => {
    try {
      await context?.close()
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    }
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  sharedBrowser ??= chromium.launch({ channel: 'chrome', headless: true, timeout: 30_000 })
  context = await (
    await sharedBrowser
  ).newContext({
    viewport: { width: 320, height: 568 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  return { page, origin: 'http://127.0.0.1:' + address.port }
}

const tileRenders = (page: Page) =>
  page.evaluate(() => (window as { __hexmateTileRenders?: number }).__hexmateTileRenders ?? 0)

const resetTileRenders = (page: Page) =>
  page.evaluate(() => {
    ;(window as { __hexmateTileRenders?: number }).__hexmateTileRenders = 0
  })

test('Taps re-render only the tiles they change', { timeout: 60_000 }, async (t) => {
  const { page, origin } = await fixture(t)
  const state = field([
    new King(0, 0, 0, 'player'),
    new Swordsman(1, 1, 0, 'player'),
    new Swordsman(2, 3, 0, 'enemy'),
    new King(3, 5, 0, 'enemy'),
  ])
  state.seed = 'tile-render-gate'
  await page.goto(origin + base)
  await page.evaluate(
    (saved) => localStorage.setItem('hexmate.battle', JSON.stringify(saved)),
    {
      version: BATTLE_SNAPSHOT_VERSION,
      identity: battleIdentity('ai', state.seed, DEFAULT_BOT_CONFIG, undefined),
      state: snapshotState(state),
    },
  )
  await page.goto(origin + base + 'game/' + state.seed)
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  const tutorial = page.getByRole('dialog', { name: 'Quick play' })
  if (await tutorial.isVisible()) {
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
    await tutorial.waitFor({ state: 'hidden' })
  }
  await page.evaluate(() => document.querySelector<HTMLDialogElement>('dialog[open]')?.close())
  await page.waitForTimeout(500)

  // Inspecting the enemy swordsman only repaints its range and its own tile.
  await resetTileRenders(page)
  await page.click('[data-q="3"][data-r="0"]')
  await page.waitForTimeout(300)
  const inspected = await tileRenders(page)
  assert.ok(
    inspected <= INSPECT_TAP_BUDGET,
    `Inspecting an enemy re-rendered ${inspected} tiles (budget ${INSPECT_TAP_BUDGET}); ` +
      'HexTile memo probably regressed',
  )

  // A one-tile move only repaints the route, the reach around both ends and
  // the selection change. Toggle the inspection off first so its teardown does
  // not count towards the move.
  await page.click('[data-q="3"][data-r="0"]')
  await page.waitForTimeout(300)
  await resetTileRenders(page)
  await page.click('[data-testid="hex-tile"][role="button"]')
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  await page.waitForTimeout(500)
  const moved = await tileRenders(page)
  assert.ok(
    moved <= MOVE_TAP_BUDGET,
    `A one-tile move re-rendered ${moved} tiles (budget ${MOVE_TAP_BUDGET}); ` +
      'HexTile memo probably regressed',
  )
})
