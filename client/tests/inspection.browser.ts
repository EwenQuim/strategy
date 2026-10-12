import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from 'playwright-core'
import { Archer, King } from '../src/lib/engine/index.ts'
import { DEFAULT_BOT_CONFIG } from '../src/bots/catalog.ts'
import {
  battleIdentity,
  BATTLE_SNAPSHOT_VERSION,
  snapshotState,
} from '../src/lib/battleSnapshot.ts'
import { field } from './field.ts'

const files = new Map<string, Buffer>()
const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}
const server = createServer((request, response) => {
  const path = new URL(request.url!, 'http://127.0.0.1').pathname
  const navigation = request.headers.accept?.includes('text/html')
  const content =
    files.get(path) ?? (navigation ? files.get('/strategy/index.html') : undefined)
  response.writeHead(content ? 200 : 404, {
    'Content-Type': navigation
      ? mime['.html']
      : (mime[extname(path)] ?? 'application/octet-stream'),
  })
  response.end(content)
})
let browser: Browser
let origin: string

before(async () => {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url))
  for (const entry of await readdir(dist, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) {
      const path = join(entry.parentPath, entry.name)
      files.set('/strategy/' + relative(dist, path), await readFile(path))
    }
  }
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = 'http://127.0.0.1:' + address.port
  browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 30_000 })
})
after(async () => {
  await browser?.close()
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

test(
  'Unit focus is read-only and cannot interrupt attack targeting',
  { timeout: 30_000 },
  async (t) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    })
    t.after(() => context.close())
    const page = await context.newPage()
    page.setDefaultTimeout(5_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const state = field([
      new Archer(1, 0, 0, 'player'),
      new King(2, -3, -2, 'player'),
      new Archer(3, 2, 0, 'enemy'),
      new King(4, 5, 0, 'enemy'),
    ])
    await page.goto(origin + '/strategy/')
    await page.evaluate(
      (saved) => localStorage.setItem('hexmate.battle', JSON.stringify(saved)),
      {
        version: BATTLE_SNAPSHOT_VERSION,
        identity: battleIdentity('local', state.seed, DEFAULT_BOT_CONFIG, undefined),
        state: snapshotState(state),
      },
    )
    await page.goto(origin + '/strategy/game/' + state.seed + '?mode=local')
    const special = page.locator('[data-action="special"]')
    await special.waitFor()
    const enemy = (id: number) =>
      page
        .getByTestId('hex-tile')
        .filter({ has: page.locator('title', { hasText: new RegExp('#' + id + ',') }) })
    const focus = page.getByTestId('unit-focus')
    await enemy(3).click()
    await focus.waitFor()
    assert.equal(await page.locator('[data-action]').count(), 0)
    assert.equal(
      await page.getByRole('meter', { name: 'Health' }).getAttribute('aria-valuenow'),
      String(state.pawns[2].hp),
    )
    assert.ok(await page.locator('polygon[fill="url(#range-hatch)"]').count())
    assert.equal(await page.locator('[data-testid="tile-face"][fill="#b79dce"]').count(), 0)
    await page.getByRole('button', { name: /Inspect .*#4$/ }).click()
    assert.equal(
      await page.getByRole('meter', { name: 'Health' }).getAttribute('aria-valuenow'),
      String(state.pawns[3].hp),
    )
    await page.getByRole('button', { name: 'Close unit focus', exact: true }).click()
    await special.waitFor()
    await special.click()
    assert.equal(await special.getAttribute('aria-pressed'), 'true')
    assert.equal(await enemy(3).getAttribute('role'), 'button')
    assert.equal(await page.locator('polygon[fill="url(#range-hatch)"]').count(), 0)
    await enemy(4).click()
    await page.getByRole('button', { name: /Inspect .*#4$/ }).click()
    assert.equal(await focus.count(), 0)
    assert.equal(await special.getAttribute('aria-pressed'), 'true')
    assert.equal(await enemy(3).getAttribute('role'), 'button')
    await special.click()
    await enemy(4).click()
    await focus.waitFor()
    const close = page.getByRole('button', { name: 'Close unit focus', exact: true })
    await close.focus()
    await page.keyboard.press('Enter')
    await special.click()
    await enemy(3).click()
    await page.waitForFunction(
      (energy) =>
        document
          .querySelector('[role="meter"][aria-label="Energy"]')
          ?.getAttribute('aria-valuenow') === String(energy),
      state.pawns[0].energy - state.pawns[0].special.cost,
    )
    assert.equal(await focus.count(), 0)
    assert.deepEqual(errors, [])
  },
)

test(
  'Compact End turn keeps every translation inside its button across responsive viewports',
  { timeout: 60_000 },
  async (t) => {
    for (const locale of ['en', 'fr', 'de', 'es', 'it']) {
      const context = await browser.newContext({
        locale,
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      })
      t.after(() => context.close())
      const page = await context.newPage()
      await page.goto(origin + '/strategy/game/style-check?mode=local')
      const endTurn = page.locator('[data-action="endTurn"]')
      await endTurn.waitFor()
      for (const viewport of [
        { width: 320, height: 568 },
        { width: 360, height: 568 },
        { width: 390, height: 844 },
        { width: 600, height: 480 },
        { width: 600, height: 481 },
        { width: 601, height: 844 },
        { width: 800, height: 450 },
        { width: 900, height: 650 },
        { width: 900, height: 651 },
        { width: 1280, height: 900 },
      ]) {
        await page.setViewportSize(viewport)
        assert.ok(
          await endTurn.evaluate((button) => {
            const rect = button.getBoundingClientRect()
            const special = document
              .querySelector('[data-action="special"]')!
              .getBoundingClientRect()
            return (
              rect.width < special.width &&
              rect.height >= 44 &&
              rect.right <= innerWidth &&
              rect.bottom <= innerHeight &&
              [...button.querySelectorAll('span, small')].every((label) => {
                const box = label.getBoundingClientRect()
                return (
                  label.scrollWidth <= label.clientWidth &&
                  box.left >= rect.left &&
                  box.right <= rect.right &&
                  box.top >= rect.top &&
                  box.bottom <= rect.bottom
                )
              }) &&
              document.documentElement.scrollWidth <= innerWidth &&
              document.documentElement.scrollHeight <= innerHeight
            )
          }),
          locale + ' at ' + JSON.stringify(viewport),
        )
      }
      await context.close()
    }
  },
)
