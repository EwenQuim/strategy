import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative } from 'node:path'
import { test, type TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright-core'
import {
  BIOMES,
  initialState,
  activePawn,
  canAttack,
  type Action,
  type Biome,
} from '../src/lib/engine/index.ts'
import { initialState as botState, transition as botTransition } from '../src/lib/bot.ts'

const base = '/strategy/'
const timeout = 10_000
const polling = { polling: 100, timeout }
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

async function fixture(t: TestContext) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url))
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
  for (const path of files.keys()) {
    if (path !== base + 'sw.js' && path !== base + '404.html')
      assert.ok(assets.includes(path), 'Missing precache asset: ' + path)
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
  let browser: Browser | undefined
  t.after(async () => {
    try {
      await browser?.close()
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
  const prefix = 'hex-strategy:' + origin + base + ':'
  browser = await chromium.launch({ channel: 'chrome', headless: true, timeout })
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    reducedMotion: 'reduce',
  })
  context.setDefaultTimeout(timeout)
  context.setDefaultNavigationTimeout(timeout)
  const page = await context.newPage()
  await page.goto(origin + base)
  await page.waitForFunction(
    () => navigator.serviceWorker.controller?.state === 'activated',
    undefined,
    polling,
  )
  const probe = await context.newPage()
  await probe.goto(origin + '/probe')
  const registration = await probe.evaluateHandle(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/strategy/')
    if (!registration) throw new Error('Missing app registration')
    return registration
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

async function playTurn(page: Page) {
  await page.locator('.end-action:not([disabled])').waitFor()
  const current = await page.locator('[aria-current="step"]').getAttribute('title')
  await page.getByRole('button', { name: /End turn/ }).click()
  await page.waitForFunction(
    (previous) =>
      document.querySelector('[aria-current="step"]')?.getAttribute('title') !== previous &&
      !!document.querySelector('.end-action:not([disabled])'),
    current,
    polling,
  )
  assert.equal(
    await page.evaluate(() => {
      const root = document.documentElement
      return (
        root.scrollWidth <= innerWidth &&
        root.scrollHeight <= innerHeight &&
        ['.game-shell', '.battlefield', '.command-deck'].every((selector) => {
          const rect = document.querySelector(selector)!.getBoundingClientRect()
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.left >= -1 &&
            rect.top >= -1 &&
            rect.right <= innerWidth + 1 &&
            rect.bottom <= innerHeight + 1
          )
        })
      )
    }),
    true,
    'The board and actions must fit a small portrait viewport without scrolling',
  )
}

function releaseMarker(page: Page) {
  return page.evaluate(
    () => (globalThis as typeof globalThis & { __pwaRelease?: string }).__pwaRelease,
  )
}

test(
  'PWA installs every asset, plays a new route offline, and defers an online update until tabs close',
  { timeout: 60_000 },
  async (t) => {
    const {
      context,
      page,
      probe,
      registration,
      origin,
      prefix,
      cacheName,
      files,
      requests,
      releaseB,
    } = await fixture(t)
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
    assert.ok(manifestHref)
    const manifestUrl = new URL(manifestHref, page.url())
    const manifest = JSON.parse(files.get(manifestUrl.pathname)!.toString()) as {
      name: string
      start_url: string
      scope: string
      display: string
      icons: { src: string; sizes: string; type: string }[]
    }
    assert.ok(manifest.name)
    assert.equal(new URL(manifest.scope, manifestUrl).href, origin + base)
    assert.ok(new URL(manifest.start_url, manifestUrl).href.startsWith(origin + base))
    assert.equal(manifest.display, 'standalone')
    for (const size of [192, 512]) {
      const icon = manifest.icons.find((item) =>
        item.sizes.split(' ').includes(size + 'x' + size),
      )
      assert.ok(icon)
      assert.equal(icon.type, 'image/png')
      const png = files.get(new URL(icon.src, manifestUrl).pathname)
      assert.ok(png)
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
      assert.equal(png.readUInt32BE(16), size)
      assert.equal(png.readUInt32BE(20), size)
    }
    const cdp = await context.newCDPSession(page)
    assert.deepEqual((await cdp.send('Page.getAppManifest')).errors, [])
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    assert.deepEqual(
      installabilityErrors.filter((error) => error.errorId !== 'in-incognito'),
      [],
    )
    await cdp.detach()

    const route = base + 'game/pwa-offline-first'
    assert.equal(requests.has(route), false)
    await context.setOffline(true)
    assert.equal((await page.goto(origin + route))?.fromServiceWorker(), true)
    await playTurn(page)
    assert.equal(requests.has(route), false)
    const match = await page.locator('.turn-order').innerHTML()
    const started = await page.evaluate(() => performance.timeOrigin)
    const unrelated = ['unrelated-cache', 'hex-strategy:' + origin + '/other/:keep']
    await probe.evaluate(
      async (names) => {
        for (const name of names) await caches.open(name)
      },
      [...unrelated, prefix + 'obsolete'],
    )

    const next = releaseB()
    await context.setOffline(false)
    await probe.waitForFunction(
      (registration) =>
        registration.waiting?.state === 'installed' &&
        registration.active?.state === 'activated',
      registration,
      polling,
    )
    assert.ok(requests.has(next.newScript), 'Coming online must download the new release')
    assert.equal(await page.evaluate(() => performance.timeOrigin), started)
    assert.equal(await page.locator('.turn-order').innerHTML(), match)
    assert.equal(await releaseMarker(page), undefined)
    const waitingCaches = await probe.evaluate(() => caches.keys())
    assert.ok(waitingCaches.includes(cacheName))
    assert.ok(waitingCaches.includes(next.cacheName))

    await page.close()
    await probe.waitForFunction(
      (registration) =>
        registration.waiting === null && registration.active?.state === 'activated',
      registration,
      polling,
    )
    assert.deepEqual(
      (await probe.evaluate(() => caches.keys())).sort(),
      [...unrelated, next.cacheName].sort(),
    )
    await context.setOffline(true)
    const updated = await context.newPage()
    assert.equal(
      (await updated.goto(origin + base + 'game/pwa-release-b'))?.fromServiceWorker(),
      true,
    )
    await playTurn(updated)
    assert.equal(await releaseMarker(updated), 'B')
    assert.equal(
      await updated.locator('script[type="module"]').getAttribute('src'),
      next.newScript,
    )
  },
)

test(
  'A failed release precache leaves the old app usable offline',
  { timeout: 60_000 },
  async (t) => {
    const { context, page, probe, origin, cacheName, requests, failing, releaseB } =
      await fixture(t)
    const next = releaseB()
    failing.add(next.newScript)
    await probe.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration('/strategy/')
      if (!registration) throw new Error('Missing app registration')
      registration.addEventListener(
        'updatefound',
        () => {
          const installing = registration.installing
          installing?.addEventListener('statechange', () => {
            document.body.dataset.installState = installing.state
          })
        },
        { once: true },
      )
      await registration.update()
    })
    await probe.waitForFunction(
      () => document.body.dataset.installState === 'redundant',
      undefined,
      polling,
    )
    assert.ok(
      requests.has(next.newScript),
      'The new release must actually attempt its failed precache',
    )
    assert.equal(
      await probe.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration('/strategy/')
        return registration?.waiting === null && registration.active?.state === 'activated'
      }),
      true,
    )
    assert.ok((await probe.evaluate(() => caches.keys())).includes(cacheName))
    await page.close()
    await context.setOffline(true)
    const offline = await context.newPage()
    assert.equal(
      (await offline.goto(origin + base + 'game/pwa-failed-update'))?.fromServiceWorker(),
      true,
    )
    await playTurn(offline)
    assert.equal(await releaseMarker(offline), undefined)
  },
)

test(
  'All three seeded biomes render and play offline on a small portrait screen',
  { timeout: 60_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const seeds = new Map<Biome, string>()
    for (let index = 0; index < 100 && seeds.size < 3; index++) {
      const seed = 'biome-' + index
      seeds.set(initialState(seed).biome, seed)
    }
    assert.equal(seeds.size, 3)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    for (const [biome, seed] of seeds) {
      await page.goto(origin + base + 'game/' + seed)
      await page.locator('.end-action:not([disabled])').waitFor()
      assert.equal(await page.locator('.wordmark-sub').textContent(), BIOMES[biome].name)
      assert.equal(await page.locator('.hex-tile').count(), 96)
      const terrain = await page
        .locator('.hex-tile')
        .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute('aria-label')!))
      assert.equal(
        terrain.some((label) => label.includes('lake')),
        biome === 'verdant',
      )
      assert.equal(
        terrain.some((label) => label.includes('mountain')),
        biome === 'mountains',
      )
      assert.equal(
        terrain.some((label) => label.includes('sand')),
        biome === 'desert',
      )
      if (biome === 'desert') assert.ok(terrain.every((label) => /sand|health/.test(label)))
      await playTurn(page)
    }
    assert.deepEqual(errors, [])
  },
)

test(
  'Hits and misses animate for both armies, remain readable with reduced motion, and lock input',
  { timeout: 120_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion })
      const seed = 'juice-1'
      let state = botState(seed)
      await page.goto(origin + base + 'game/' + seed)
      await page.locator('.end-action:not([disabled])').waitFor()
      await page.evaluate(() => {
        const seen = new Set<Element>()
        const checks: unknown[] = []
        document.body.dataset.combatChecks = '[]'
        new MutationObserver(() => {
          const impacts = document.querySelector('.combat-impacts')
          if (!impacts || seen.has(impacts)) return
          seen.add(impacts)
          const feedback = document.querySelector('.combat-feedback')!
          const title = document.querySelector('[aria-current="step"]')!.getAttribute('title')!
          const labels = [...impacts.querySelectorAll('.impact-label')]
          checks.push({
            labels: labels.map((label) => label.textContent!.trim()),
            animations: labels.map((label) => getComputedStyle(label).animationName),
            side: title.startsWith('Enemy') ? 'enemy' : 'player',
            enemyBanner: !!document.querySelector('.enemy-turn'),
            locked: (document.querySelector('.end-action') as HTMLButtonElement).disabled,
            screenDisplay: getComputedStyle(feedback).display,
            screenAnimation: getComputedStyle(feedback, '::before').animationName,
            pointerEvents: getComputedStyle(feedback).pointerEvents,
            fits:
              document.documentElement.scrollWidth <= innerWidth &&
              document.documentElement.scrollHeight <= innerHeight,
          })
          document.body.dataset.combatChecks = JSON.stringify(checks)
        }).observe(document.body, { childList: true, subtree: true })
      })
      const expected: { labels: string[]; side: string }[] = []
      const outcomes = new Set<string>()
      for (let turn = 0; turn < 30 && !state.winner; turn++) {
        const pawn = activePawn(state)!
        const target = state.pawns.find((p) => canAttack(pawn, p))
        const actions: Action[] = target
          ? [
              { type: 'act', action: 'attack' },
              { type: 'attackAt', q: target.q, r: target.r },
            ]
          : [{ type: 'endTurn' }]
        for (const action of actions) {
          const result = botTransition(state, action)
          for (const frame of result.frames) {
            if (!frame.effect?.impacts?.length) continue
            const side = activePawn(frame.state)!.side
            const labels = frame.effect.impacts.map((hit) => {
              outcomes.add((hit.damage ? 'hit-' : 'miss-') + side)
              return hit.damage ? '-' + hit.damage : 'MISS'
            })
            expected.push({ labels, side })
          }
          if (action.type === 'endTurn') await page.locator('.end-action').click()
          else if (action.type === 'act') await page.locator('.attack-action').click()
          else if (action.type === 'attackAt') {
            const tile = [...state.tiles.values()].findIndex(
              (tile) => tile.q === action.q && tile.r === action.r,
            )
            await page.locator('.hex-tile').nth(tile).click()
          }
          state = result.state
          if (state.winner) await page.locator('.battle-result').waitFor()
          else await page.locator('.end-action:not([disabled])').waitFor()
        }
        if (['hit-player', 'hit-enemy', 'miss-enemy'].every((outcome) => outcomes.has(outcome)))
          break
      }
      assert.ok(
        ['hit-player', 'hit-enemy', 'miss-enemy'].every((outcome) => outcomes.has(outcome)),
      )
      const checks = (await page.evaluate(() =>
        JSON.parse(document.body.dataset.combatChecks!),
      )) as {
        labels: string[]
        side: string
        animations: string[]
        enemyBanner: boolean
        locked: boolean
        screenDisplay: string
        screenAnimation: string
        pointerEvents: string
        fits: boolean
      }[]
      assert.deepEqual(
        checks.map(({ labels, side }) => ({ labels, side })),
        expected,
      )
      for (const check of checks) {
        assert.equal(check.locked, true)
        assert.equal(check.enemyBanner, check.side === 'enemy')
        assert.equal(check.fits, true)
        assert.equal(check.pointerEvents, 'none')
        assert.equal(check.screenDisplay, reducedMotion === 'reduce' ? 'none' : 'block')
        assert.equal(
          check.screenAnimation,
          reducedMotion === 'reduce'
            ? 'none'
            : check.labels.every((label) => label === 'MISS')
              ? 'miss-sweep'
              : 'hit-flash',
        )
        assert.deepEqual(
          check.animations,
          check.labels.map((label) =>
            reducedMotion === 'reduce'
              ? 'none'
              : label === 'MISS'
                ? 'miss-drift'
                : 'damage-pop',
          ),
        )
      }
      assert.equal(await page.locator('.combat-feedback').count(), 0)
    }
    assert.deepEqual(errors, [])
  },
)
