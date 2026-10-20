import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative } from 'node:path'
import { after, type TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'
import { type Action, type Axial, type GameState } from '../../src/lib/engine/index.ts'
import { createBotGame } from '../bot-game.ts'
import { CAMPAIGNS } from '../../src/campaign.ts'
import { campaignBot } from '../../src/bots/campaign.ts'
import { campaignActions } from '../campaign-actions.ts'
import { getBot } from '../../src/bots/catalog.ts'

export const base = '/strategy/'
const timeout = 10_000
export const polling = { polling: 100, timeout }
const versionPattern = /const VERSION\s*=\s*("[^"]+");/
const assetsPattern = /const ASSETS\s*=\s*(\[[\s\S]*?\]);/
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}
export let sharedBrowser: Promise<Browser> | undefined
after(async () => (await sharedBrowser)?.close())
export async function fixture(t: TestContext) {
  const dist = fileURLToPath(new URL('../../dist/', import.meta.url))
  const files = new Map<string, Buffer>()
  for (const entry of await readdir(dist, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) {
      const path = join(entry.parentPath, entry.name)
      files.set(base + relative(dist, path).split('\\').join('/'), await readFile(path))
    }
  }
  const worker = files.get(base + 'sw.js')?.toString()
  assert.ok(worker, 'Run npm run build before the PWA browser tests')
  const versionMatch = worker.match(versionPattern)
  const assetsMatch = worker.match(assetsPattern)
  assert.ok(versionMatch, 'Built worker must contain the injected VERSION')
  assert.ok(assetsMatch, 'Built worker must contain the injected ASSETS')
  const version: string = JSON.parse(versionMatch[1])
  const assets: string[] = JSON.parse(assetsMatch[1])
  assert.ok(Array.isArray(assets) && assets.every((url) => typeof url === 'string'))
  const precached = (path: string) => {
    const file = path.slice(base.length)
    return (
      file !== 'sw.js' &&
      file !== '404.html' &&
      !file.endsWith('.map') &&
      file.split('/').every((segment) => segment[0] !== '.')
    )
  }
  for (const path of files.keys()) {
    if (precached(path)) assert.ok(assets.includes(path), 'Missing precache asset: ' + path)
  }
  const requests = new Map<string, number>()
  const failing = new Set<string>()
  const server = createServer((request, response) => {
    const path = new URL(request.url!, 'http://127.0.0.1').pathname
    requests.set(path, (requests.get(path) ?? 0) + 1)
    response.setHeader('Cache-Control', 'no-store')
    if (failing.has(path)) {
      response.writeHead(503).end('Release asset unavailable')
      return
    }
    const navigation = path.startsWith(base) && request.headers.accept?.includes('text/html')
    const content =
      path === '/probe'
        ? Buffer.from('<!doctype html><title>PWA probe</title>')
        : (files.get(path) ?? (navigation ? files.get(base + 'index.html') : undefined))
    response.writeHead(content ? 200 : 404, {
      'Content-Type':
        path === '/probe' || navigation
          ? mime['.html']
          : (mime[extname(path)] ?? 'application/octet-stream'),
    })
    response.end(content)
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
  const origin = 'http://127.0.0.1:' + address.port
  const prefix = 'hexmate:' + origin + base + ':'
  sharedBrowser ??= chromium.launch({ channel: 'chrome', headless: true, timeout: 30_000 })
  context = await (
    await sharedBrowser
  ).newContext({
    viewport: { width: 320, height: 568 },
    reducedMotion: 'reduce',
  })
  context.setDefaultTimeout(timeout)
  context.setDefaultNavigationTimeout(timeout)
  const page = await context.newPage()
  const controlledReload = page.waitForResponse(
    (response) => response.request().isNavigationRequest() && response.fromServiceWorker(),
  )
  await page.goto(origin + base)
  await controlledReload
  await page.waitForLoadState('load')
  await page.waitForFunction(
    () => navigator.serviceWorker.controller?.state === 'activated',
    undefined,
    polling,
  )
  const probe = await context.newPage()
  await probe.goto(origin + '/probe')
  const registration = await probe.evaluateHandle(async () => {
    const appRegistration = await navigator.serviceWorker.getRegistration('/strategy/')
    if (!appRegistration) throw new Error('Missing app registration')
    return appRegistration
  })
  assert.equal(await probe.evaluate(() => navigator.serviceWorker.controller), null)
  assert.equal(
    await probe.evaluate(
      async () => (await navigator.serviceWorker.getRegistration('/strategy/'))?.updateViaCache,
    ),
    'none',
  )
  const cacheName = prefix + version
  const cached = await probe.evaluate(async (name) => {
    const cache = await caches.open(name)
    return (await cache.keys()).map((request) => new URL(request.url).pathname)
  }, cacheName)
  for (const asset of assets) assert.ok(cached.includes(asset), 'Not cached: ' + asset)
  // Opening the probe backgrounds the app page, and CI Chrome then throttles its animation
  // frames, so every Playwright stability check before a click waits about two seconds.
  await page.bringToFront()

  function releaseB() {
    const html = files.get(base + 'index.html')!.toString()
    const script = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"/)
    assert.ok(script, 'Built HTML must load a main script')
    const oldScript = script[1]
    const newScript = oldScript.replace(/\.js$/, '-release-B.js')
    const source = files.get(oldScript)
    assert.ok(source)
    files.set(newScript, Buffer.from(source.toString() + '\n;globalThis.__pwaRelease="B";\n'))
    files.delete(oldScript)
    const oldName = oldScript.slice(oldScript.lastIndexOf('/') + 1)
    const newName = newScript.slice(newScript.lastIndexOf('/') + 1)
    for (const [path, content] of files) {
      if (path.endsWith('.js') && path !== base + 'sw.js')
        files.set(path, Buffer.from(content.toString().replaceAll(oldName, newName)))
    }
    files.set(base + 'index.html', Buffer.from(html.replaceAll(oldScript, newScript)))
    const nextAssets = assets.map((asset) => (asset === oldScript ? newScript : asset))
    files.set(
      base + 'sw.js',
      Buffer.from(
        worker!
          .replace(
            versionPattern,
            () => 'const VERSION = ' + JSON.stringify(version + '-B') + ';',
          )
          .replace(assetsPattern, () => 'const ASSETS = ' + JSON.stringify(nextAssets) + ';'),
      ),
    )
    return { newScript, cacheName: prefix + version + '-B' }
  }
  return {
    context,
    page,
    probe,
    registration,
    origin,
    prefix,
    cacheName,
    files,
    requests,
    failing,
    releaseB,
  }
}
// The spotlight tour pauses the battle, so the command deck only wakes up once it is gone.
export async function dismissTour(page: Page) {
  await page.locator('[data-action="endTurn"]').waitFor()
  const tour = page.getByRole('dialog', { name: 'Quick tour' })
  if (await tour.isVisible()) {
    await tour.getByRole('button', { name: 'Skip', exact: true }).click()
    await tour.waitFor({ state: 'hidden' })
  }
}
export async function dismissQuickPlayTutorial(page: Page) {
  await dismissTour(page)
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
}
export async function playInUi(page: Page, state: GameState, action: Action) {
  const clickTile = (at: Axial) =>
    page
      .locator('[data-testid="hex-tile"]')
      .nth([...state.tiles.values()].findIndex((tile) => tile.q === at.q && tile.r === at.r))
      .click()
  if (action.type === 'endTurn') return page.locator('[data-action="endTurn"]').click()
  if (action.type === 'move') {
    // Move tiles only appear in Move mode, which stays on for the whole activation.
    const moveButton = page.locator('[data-action="move"]')
    if ((await moveButton.getAttribute('aria-pressed')) !== 'true') await moveButton.click()
    return clickTile(action)
  }
  if (action.type === 'special') {
    // A move that keeps the turn leaves the ability aimed, so press it only when it is not.
    const special = page.locator('[data-action="special"]')
    if ((await special.getAttribute('aria-pressed')) !== 'true') await special.click()
    if (action.destination) await clickTile(action.destination)
    if (action.target) await clickTile(action.target)
    else if (action.destination && /Land here/.test(await special.innerText()))
      await special.click()
    return
  }
  assert.fail('Unexpected action: ' + action.type)
}
export async function playTurn(page: Page) {
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  const current = await page
    .locator('[data-testid="initiative-unit"][aria-current="step"]')
    .getAttribute('title')
  await page.getByRole('button', { name: /End turn/ }).click()
  await page.waitForFunction(
    (previous) =>
      document
        .querySelector('[data-testid="initiative-unit"][aria-current="step"]')
        ?.getAttribute('title') !== previous &&
      !!document.querySelector('[data-action="endTurn"]:not([disabled])'),
    current,
    polling,
  )
  assert.equal(
    await page.evaluate(() => {
      const root = document.documentElement
      return (
        root.scrollWidth <= innerWidth &&
        root.scrollHeight <= innerHeight &&
        ['[data-biome]', '[data-testid="battlefield"]', '[data-testid="command-deck"]'].every(
          (selector) => {
            const rect = document.querySelector(selector)!.getBoundingClientRect()
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              rect.left >= -1 &&
              rect.top >= -1 &&
              rect.right <= innerWidth + 1 &&
              rect.bottom <= innerHeight + 1
            )
          },
        )
      )
    }),
    true,
    'The board and actions must fit a small portrait viewport without scrolling',
  )
}
export async function readBuildLabel(page: Page) {
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  const label = await page.getByTitle('Git commit used for this build').textContent()
  await page.getByRole('link', { name: 'Back to home', exact: true }).click()
  return label
}
export function releaseMarker(page: Page) {
  return page.evaluate(
    () => (globalThis as typeof globalThis & { __pwaRelease?: string }).__pwaRelease,
  )
}
export async function finishCampaignLevel(page: Page, id: number, surrender = false) {
  const level = CAMPAIGNS[1].levels[id - 1]
  const bot = createBotGame(getBot(campaignBot(CAMPAIGNS[1], level)))
  let state = (
    await bot.transition(bot.initialState(level.seed, level.setup), { type: 'restart' })
  ).state
  if (level.newElements.length)
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  assert.equal(
    await page.locator('[data-testid="battle-subtitle"]').textContent(),
    id + ' / 20',
  )
  for (let step = 0; step < 200 && !state.winner; step++) {
    const actions: Action[] = surrender ? [{ type: 'endTurn' }] : await campaignActions(state)
    for (const action of actions) {
      const result = await bot.transition(state, action)
      await playInUi(page, state, action)
      state = result.state
      if (state.winner) await page.locator('[data-testid="battle-result"]').waitFor()
      else await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    }
  }
  assert.ok(state.winner)
  return state.winner
}
