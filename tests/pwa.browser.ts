import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
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
  movementDestinations,
  specialTargets,
  type Action,
  type Biome,
} from '../src/lib/engine/index.ts'
import {
  initialState as botState,
  transition as botTransition,
  chooseBotActions,
} from '../src/lib/bot.ts'
import { transition } from '../src/lib/engine/engine.ts'
import { huntTheKing } from '../src/lib/strategies.ts'
import { armyLabels, playerNames } from '../src/lib/game-mode.ts'
import { CAMPAIGN_LEVELS, CAMPAIGN_STORAGE_KEY } from '../src/lib/campaign.ts'
import { campaignActions } from './campaign-actions.ts'

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
  const prefix = 'hexmate:' + origin + base + ':'
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
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  const current = await page.locator('[aria-current="step"]').getAttribute('title')
  await page.getByRole('button', { name: /End turn/ }).click()
  await page.waitForFunction(
    (previous) =>
      document.querySelector('[aria-current="step"]')?.getAttribute('title') !== previous &&
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

function releaseMarker(page: Page) {
  return page.evaluate(
    () => (globalThis as typeof globalThis & { __pwaRelease?: string }).__pwaRelease,
  )
}

test(
  'Custom play mirrors rosters live, allows independent enemies, and launches configured battles offline',
  { timeout: 60_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    await page.getByRole('link', { name: 'Custom play' }).click()
    const playerArcher = page.getByRole('spinbutton', { name: 'Player archer', exact: true })
    const enemyArcher = page.getByRole('spinbutton', { name: 'Enemy archer', exact: true })
    const mirror = page.getByRole('checkbox', { name: 'Mirror player roster' })
    assert.equal(await mirror.isChecked(), true)
    assert.equal(await enemyArcher.isDisabled(), true)
    await playerArcher.fill('3')
    assert.equal(await enemyArcher.inputValue(), '3')
    await mirror.uncheck()
    await enemyArcher.fill('2')
    assert.equal(await playerArcher.inputValue(), '3')
    await playerArcher.fill('4')
    assert.equal(await enemyArcher.inputValue(), '2')
    await mirror.check()
    assert.equal(await enemyArcher.inputValue(), '4')
    assert.equal(await enemyArcher.isDisabled(), true)
    await mirror.uncheck()
    await enemyArcher.fill('1')
    await page.getByLabel('Mode', { exact: true }).selectOption('local')
    assert.equal(await page.getByLabel('Difficulty', { exact: false }).isDisabled(), true)
    await page.getByLabel('Biome', { exact: true }).selectOption('mountains')
    await page.getByRole('spinbutton', { name: 'Player 1 swordsman', exact: true }).fill('17')
    await page.getByRole('spinbutton', { name: 'Player 2 swordsman', exact: true }).fill('20')
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      assert.equal(
        await page.evaluate(() => {
          const button = document.querySelector('form > button')!.getBoundingClientRect()
          return (
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight &&
            button.top >= 0 &&
            button.bottom <= innerHeight
          )
        }),
        true,
        'Custom settings must keep Start battle visible without page overflow',
      )
      assert.equal(
        await page.locator('table input').evaluateAll((inputs) => {
          const first = inputs[0].getBoundingClientRect()
          const beside = inputs[1].getBoundingClientRect()
          const below = inputs[2].getBoundingClientRect()
          return beside.left - first.right >= 8 && below.top - first.bottom >= 8
        }),
        true,
        'Roster inputs must have at least 8px of space outside their boxes in both directions',
      )
    }
    await page.setViewportSize({ width: 320, height: 568 })
    await page.getByRole('button', { name: 'Start battle' }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    const search = new URL(page.url()).searchParams
    assert.equal(search.get('mode'), 'local')
    assert.equal(await page.locator('[data-biome]').getAttribute('data-biome'), 'mountains')
    assert.equal(
      await page.locator('[data-testid="initiative-unit"][data-side="player"]').count(),
      24,
    )
    assert.equal(
      await page.locator('[data-testid="initiative-unit"][data-side="enemy"]').count(),
      24,
    )
    assert.equal(
      await page
        .locator('[data-testid="initiative-unit"][data-side="player"][title*="archer"]')
        .count(),
      4,
    )
    assert.equal(
      await page
        .locator('[data-testid="initiative-unit"][data-side="enemy"][title*="archer"]')
        .count(),
      1,
    )
    const opening = await page.locator('[data-testid="battlefield"]').innerHTML()
    await page.reload()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(await page.locator('[data-testid="battlefield"]').innerHTML(), opening)
    await playTurn(page)
    assert.equal(await page.locator('[data-testid="enemy-turn"]').count(), 0)
    await page.getByRole('button', { name: 'How to play' }).click()
    assert.match(await page.locator('dialog').innerText(), /This custom battle/)
    assert.doesNotMatch(await page.locator('dialog').innerText(), /unlock the next level/)
    await page.getByRole('button', { name: 'Close dialog' }).click()
    for (const difficulty of ['easy', 'normal', 'hard']) {
      await page.goto(origin + base + 'custom')
      await page.getByLabel('Difficulty', { exact: true }).selectOption(difficulty)
      await page.getByLabel('Biome', { exact: true }).selectOption('desert')
      await page.getByRole('button', { name: 'Start battle' }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(new URL(page.url()).searchParams.get('difficulty'), difficulty)
      assert.equal(await page.locator('[data-biome]').getAttribute('data-biome'), 'desert')
      assert.equal(
        await page.locator('[data-testid="initiative-unit"][data-side="player"]').count(),
        5,
      )
      assert.equal(
        await page.locator('[data-testid="initiative-unit"][data-side="enemy"]').count(),
        5,
      )
      assert.equal(await page.locator('[data-testid="player-turn"]').count(), 0)
      await page.getByRole('button', { name: 'How to play' }).click()
      assert.ok(
        (await page.locator('dialog').innerText()).includes('AI difficulty: ' + difficulty),
      )
      await page.getByRole('button', { name: 'Close dialog' }).click()
      await playTurn(page)
    }
    assert.deepEqual(errors, [])
  },
)

test(
  'Bulwarks show slow movement costs and protect allies offline on a small portrait screen',
  { timeout: 30_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    let state = initialState('bulwark-ui')
    for (let index = 0; index < 1000; index++) {
      state = initialState('bulwark-ui-' + index)
      const pawn = activePawn(state)!
      if (
        pawn.kind === 'bulwark' &&
        specialTargets(state.pawns, pawn).length &&
        movementDestinations(state.tiles, state.pawns, pawn).size > 1
      )
        break
    }
    const pawn = activePawn(state)!
    assert.equal(pawn.kind, 'bulwark')
    const ally = specialTargets(state.pawns, pawn)[0]
    assert.ok(ally)
    const tileIndex = [...state.tiles.values()].findIndex(
      (tile) => tile.q === ally.q && tile.r === ally.r,
    )
    await context.setOffline(true)
    await page.goto(origin + base + 'game/' + state.seed + '?mode=local')
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(
      await page.getByRole('meter', { name: 'Health' }).getAttribute('aria-valuemax'),
      '10',
    )
    assert.equal(await page.locator('[aria-label="Health"] [data-filled="true"]').count(), 10)
    const moves = page.getByRole('button', { name: /^Move to / })
    assert.ok(await moves.count())
    const moveCosts = await moves.evaluateAll((tiles) =>
      tiles.map((tile) => Number(tile.getAttribute('aria-label')!.match(/(\d+) energy$/)![1])),
    )
    assert.deepEqual(
      moveCosts.sort(),
      [...movementDestinations(state.tiles, state.pawns, pawn).values()]
        .filter((cost) => cost > 0)
        .sort(),
    )
    await page.locator('[data-action="special"]').click()
    assert.match(await page.locator('[data-action="special"]').innerText(), /Choose ally/)
    const allies = page.getByRole('button', { name: /^Protect / })
    assert.equal(await allies.count(), specialTargets(state.pawns, pawn).length)
    await page.locator('[data-action="special"]').click()
    assert.equal(
      await page.getByRole('meter', { name: 'Energy' }).getAttribute('aria-valuenow'),
      '3',
    )
    await page.locator('[data-action="special"]').click()
    await page.locator('[data-testid="hex-tile"]').nth(tileIndex).click()
    assert.equal(
      await page.getByRole('meter', { name: 'Energy' }).getAttribute('aria-valuenow'),
      '1',
    )
    assert.match(
      (await page
        .locator('[data-testid="hex-tile"]')
        .nth(tileIndex)
        .getAttribute('aria-label'))!,
      /protected by bulwark/,
    )
    assert.equal(await page.locator('[data-art="protection-badge"]').count(), 1)
    assert.equal(await moves.count(), 0)
    await page.reload()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    await page
      .getByRole('button', { name: /^Move to .*2 energy$/ })
      .first()
      .click()
    assert.equal(
      await page.getByRole('meter', { name: 'Energy' }).getAttribute('aria-valuenow'),
      '1',
    )
    assert.equal(await moves.count(), 0)
    assert.equal(await page.locator('[data-action="special"]').isDisabled(), true)
    assert.equal(
      await page.evaluate(() => {
        const root = document.documentElement
        return (
          root.scrollWidth <= innerWidth &&
          root.scrollHeight <= innerHeight &&
          [
            '[data-biome]',
            '[data-testid="battlefield"]',
            '[data-testid="command-deck"]',
            '[data-testid="unit-stats"]',
          ].every((selector) => {
            const rect = document.querySelector(selector)!.getBoundingClientRect()
            return (
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= innerWidth &&
              rect.bottom <= innerHeight
            )
          })
        )
      }),
      true,
    )
    await playTurn(page)
    assert.deepEqual(errors, [])
  },
)

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
    const commit = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      cwd: new URL('../', import.meta.url),
      encoding: 'utf8',
      timeout: 5_000,
    }).trim()
    assert.equal(
      await page.locator('main > footer > span').first().textContent(),
      'Build ' + commit,
    )
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
    const match = await page.locator('ol[aria-label="Round turn order"]').innerHTML()
    const started = await page.evaluate(() => performance.timeOrigin)
    const unrelated = ['unrelated-cache', 'hexmate:' + origin + '/other/:keep']
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
    assert.equal(await page.locator('ol[aria-label="Round turn order"]').innerHTML(), match)
    assert.equal(await releaseMarker(page), undefined)
    const waitingCaches = await probe.evaluate(() => caches.keys())
    assert.ok(waitingCaches.includes(cacheName))
    assert.ok(waitingCaches.includes(next.cacheName))
    const notice = page.getByRole('status').filter({ hasText: 'Update ready.' })
    await notice.waitFor()
    assert.match(await notice.innerText(), /Finish your match, then tap Update now/)
    assert.equal(
      await notice.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return (
          rect.left >= 0 &&
          rect.top >= 0 &&
          rect.right <= innerWidth &&
          rect.bottom <= innerHeight
        )
      }),
      true,
    )
    await page.getByRole('button', { name: 'Dismiss update notice' }).click()
    await notice.waitFor({ state: 'hidden' })
    assert.equal(await page.evaluate(() => performance.timeOrigin), started)
    assert.equal(await page.locator('ol[aria-label="Round turn order"]').innerHTML(), match)

    await page.reload()
    await notice.waitFor()
    assert.equal(await releaseMarker(page), undefined, 'Refresh must not mix releases')
    await page.getByRole('button', { name: 'Dismiss update notice' }).click()
    await playTurn(page)

    const other = await context.newPage()
    await other.goto(origin + base)
    await other.getByRole('status').filter({ hasText: 'Update ready.' }).waitFor()
    assert.equal(await releaseMarker(other), undefined)
    await page.close()
    assert.equal(
      await probe.evaluate((registration) => registration.waiting?.state, registration),
      'installed',
      'Another open tab must keep the previous release active',
    )
    assert.ok((await probe.evaluate(() => caches.keys())).includes(cacheName))
    await other.close()
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
    assert.equal(await page.locator('#pwa-update').count(), 0)
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
  'New games reach all four biomes offline and retain the build label on a small portrait screen',
  { timeout: 60_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const buildLabel = await page.locator('main > footer > span').first().textContent()
    const modes = page.getByRole('group', { name: 'Choose game mode' }).getByRole('link')
    assert.deepEqual(await modes.allTextContents(), [
      'Campaign0 / 20',
      'Quick play',
      'Custom play',
      '2 players',
    ])
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      const boxes = await modes.evaluateAll((links) =>
        links.map((link) => {
          const { left, right, top, bottom, width, height } = link.getBoundingClientRect()
          return { left, right, top, bottom, width, height }
        }),
      )
      for (const [index, box] of boxes.entries()) {
        assert.equal(box.left, boxes[0].left)
        assert.equal(box.width, boxes[0].width)
        assert.ok(box.height >= 44)
        assert.ok(box.left >= 0 && box.right <= viewport.width)
        assert.ok(box.top >= 0 && box.bottom <= viewport.height)
        if (index > 0) assert.ok(box.top > boxes[index - 1].bottom)
      }
    }
    await page.setViewportSize({ width: 320, height: 568 })
    const backgrounds = new Set<string>()
    const panels = new Set<string>()
    const tileBases = new Set<string>()
    const themedBiomes: Biome[] = ['verdant', 'mountains', 'desert', 'volcano']
    const seeds = new Map<Biome, string>()
    for (let index = 0; index < 400 && seeds.size < themedBiomes.length; index++) {
      const seed = '00000000-0000-4000-8000-' + index.toString(16).padStart(12, '0')
      const biome = initialState(seed).biome
      if (themedBiomes.includes(biome)) seeds.set(biome, seed)
    }
    assert.equal(seeds.size, themedBiomes.length)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    for (const [biome, seed] of seeds) {
      await page.goto(origin + base)
      assert.equal(await page.locator('main > footer > span').first().textContent(), buildLabel)
      await page.evaluate((seed) => {
        Object.defineProperty(crypto, 'randomUUID', { value: () => seed })
      }, seed)
      await page.getByRole('link', { name: 'Quick play' }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(new URL(page.url()).pathname, base + 'game/' + seed)
      assert.equal(await page.locator('[data-action="attack"]').isVisible(), true)
      assert.equal(await page.locator('[data-action="attack"]').isDisabled(), true)
      assert.equal(await page.locator('[data-action]').count(), 3)
      assert.equal(
        await page.locator('[data-testid="battle-subtitle"]').textContent(),
        BIOMES[biome].name,
      )
      assert.equal(await page.locator('[data-testid="hex-tile"]').count(), 96)
      assert.equal(await page.locator('[data-biome]').getAttribute('data-biome'), biome)
      backgrounds.add(
        await page
          .locator('[aria-label="The battlefield"]')
          .evaluate((element) => getComputedStyle(element).background),
      )
      const panel = await page
        .locator('[data-testid="game-header"]')
        .evaluate((element) => getComputedStyle(element).backgroundColor)
      panels.add(panel)
      assert.equal(
        await page
          .locator('[data-testid="command-deck"]')
          .evaluate((element) => getComputedStyle(element).backgroundColor),
        panel,
      )
      tileBases.add(
        await page
          .locator('[data-art="tile-bases"]')
          .evaluate((element) => getComputedStyle(element).fill),
      )
      const terrain = await page
        .locator('[data-testid="hex-tile"]')
        .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute('aria-label')!))
      assert.equal(
        terrain.some((label) => label.includes('lake')),
        biome === 'verdant' || biome === 'desert',
      )
      assert.equal(
        terrain.some((label) => label.includes('mountain')),
        biome === 'mountains',
      )
      assert.equal(
        terrain.some((label) => label.includes('sand')),
        biome === 'desert',
      )
      if (biome === 'desert') {
        assert.ok(terrain.every((label) => /sand|palm|lake|health/.test(label)))
        assert.ok((await page.locator('[data-art="sand"]').count()) > 0)
        const faces = await page.locator('[data-testid="tile-face"]').evaluateAll((tiles) =>
          tiles.map((tile) => ({
            fill: getComputedStyle(tile).fill,
            stroke: getComputedStyle(tile).stroke,
          })),
        )
        assert.ok(
          faces.some((tile) => tile.fill === 'rgb(229, 188, 112)'),
          'Sand tiles must be golden',
        )
        assert.ok(
          faces.some((tile) => tile.fill === 'rgb(199, 199, 155)'),
          'Reachable tiles must still use their highlight fill',
        )
        assert.equal(
          new Set(faces.map((tile) => tile.stroke)).size,
          1,
          'Highlights must not change tile borders',
        )
      }
      if (biome === 'volcano') {
        assert.ok(terrain.some((label) => label.includes('lava')))
        assert.ok(await page.locator('[data-art="lava"]').count())
        assert.ok(await page.locator('[data-terrain=basalt]').count())
      }
      await playTurn(page)
    }
    assert.equal(backgrounds.size, 4, 'Each biome needs a distinct background')
    assert.equal(panels.size, 4, 'Headers and actions must match the biome')
    assert.equal(tileBases.size, 4, 'Tile edges must match the biome')
    assert.deepEqual(errors, [])
  },
)

test(
  'Campaign showcases volcanic terrain and each special tile with subdued, readable tile art',
  { timeout: 30_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.evaluate((key) => localStorage.setItem(key, '20'), CAMPAIGN_STORAGE_KEY)
    await context.setOffline(true)
    for (const id of [5, 9, 14, 15, 18]) {
      const level = CAMPAIGN_LEVELS[id - 1]
      await page.goto(origin + base + 'campaign/' + id)
      await page.getByRole('button', { name: 'Go !', exact: true }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(
        await page.locator('[data-biome]').getAttribute('data-biome'),
        level.setup.biome,
      )
      const state = initialState(level.seed, level.setup)
      for (const tile of state.tiles.values()) {
        if (!tile.feature) continue
        const feature = page.locator('[data-feature=' + tile.feature + ']')
        assert.equal(await feature.count(), 1)
        assert.equal(await feature.locator('[data-art="feature"]').count(), 1)
        if (id === 15) {
          assert.equal(
            await feature
              .locator('[data-testid="tile-face"]')
              .evaluate((face) => getComputedStyle(face).fill),
            'rgb(89, 78, 83)',
          )
        }
      }
      if (level.setup.biome === 'volcano') {
        const basalt = page
          .locator(
            '[data-testid="hex-tile"][data-terrain=basalt][role=img][aria-label^="basalt,"] [data-testid="tile-face"]',
          )
          .first()
        const lava = page
          .locator(
            '[data-testid="hex-tile"][data-terrain=lava][role=img][aria-label^="lava,"] [data-testid="tile-face"]',
          )
          .first()
        assert.equal(
          await basalt.evaluate((face) => getComputedStyle(face).fill),
          'rgb(89, 78, 83)',
        )
        assert.equal(await lava.getAttribute('fill'), 'url(#lava-melt)')
        const hexPoints = await lava.getAttribute('points')
        assert.equal(await page.locator('#lava-hex polygon').getAttribute('points'), hexPoints)
        assert.equal(
          await page.locator('[data-art="lava"] > g[clip-path="url(#lava-hex)"]').count(),
          await page.locator('[data-terrain=lava]').count(),
        )
        assert.ok(
          await page
            .locator('[data-art="lava"] polygon')
            .evaluateAll(
              (polygons, points) =>
                polygons.every((polygon) => polygon.getAttribute('points') === points),
              hexPoints,
            ),
        )
        assert.ok(await page.locator('[data-art="basalt"]').count())
        assert.ok(
          await page
            .locator('[data-art="lava"] path')
            .evaluateAll((paths) =>
              paths.every((path) => (path as SVGPathElement).getTotalLength() > 0),
            ),
        )
        assert.equal(
          await page
            .locator('[data-testid="tile-face"]')
            .evaluateAll(
              (faces) =>
                new Set(faces.map((face) => getComputedStyle(face).strokeOpacity)).size,
            ),
          1,
        )
      }
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
        true,
      )
    }
    assert.deepEqual(errors, [])
  },
)

test(
  'Interactive tiles stay readable on mobile, grant temporary rune energy, and warn about lethal lava',
  { timeout: 180_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    for (const kind of ['watchtower', 'spring', 'rune', 'lava'] as const) {
      let state = initialState('interactive-ui')
      let position: string | undefined
      for (let index = 0; index < 10_000; index++) {
        state = initialState('interactive-ui-' + kind + '-' + index)
        const pawn = activePawn(state)!
        if (kind === 'lava' && pawn.kind !== 'ninja') continue
        if (kind === 'watchtower' && pawn.kind !== 'archer' && pawn.kind !== 'magician')
          continue
        position = [...movementDestinations(state.tiles, state.pawns, pawn)].find(
          ([k, cost]) => {
            if (!cost) return false
            const tile = state.tiles.get(k)!
            if (kind === 'lava') return tile.terrain === 'lava'
            return tile.feature === kind
          },
        )?.[0]
        if (position) break
      }
      assert.ok(position, 'Find a reachable ' + kind)
      const pawn = activePawn(state)!
      const tile = state.tiles.get(position)!
      const index = [...state.tiles.keys()].indexOf(position)
      await page.goto(origin + base + 'game/' + state.seed + '?mode=local')
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      const destination = page.locator('[data-testid="hex-tile"]').nth(index)
      if (kind === 'lava') {
        assert.match((await destination.getAttribute('aria-label'))!, /lethal/)
        assert.doesNotMatch(
          await destination
            .locator('text')
            .allTextContents()
            .then((labels) => labels.join(' ')),
          /HP|LETHAL/,
        )
        assert.equal(
          await destination
            .locator('[data-testid="tile-face"]')
            .evaluate((face) => getComputedStyle(face).fill),
          'rgb(148, 113, 109)',
        )
        await page.locator('[data-action="special"]').click()
        assert.match((await destination.getAttribute('aria-label'))!, /Jump to .*lethal/)
        assert.equal(
          await destination
            .locator('[data-testid="tile-face"]')
            .evaluate((face) => getComputedStyle(face).fill),
          'rgb(148, 113, 109)',
        )
        await page.locator('[data-action="special"]').click()
      } else {
        assert.match(
          (await destination.getAttribute('aria-label'))!,
          new RegExp(
            kind === 'rune'
              ? 'Power rune'
              : kind === 'spring'
                ? 'Healing spring'
                : 'Watchtower',
          ),
        )
        assert.equal(await destination.locator('[data-feature-art=' + kind + ']').count(), 1)
      }
      await destination.click()
      state = transition(state, { type: 'move', q: tile.q, r: tile.r }).state
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      if (kind === 'lava') {
        assert.ok(!state.pawns.some((unit) => unit.id === pawn.id))
        assert.equal(
          await page.locator('[data-testid="pawn-chip"]').count(),
          state.pawns.length,
        )
      } else {
        assert.equal(
          await destination.getAttribute('data-feature'),
          kind === 'rune' ? null : kind,
        )
        if (kind === 'rune') {
          assert.equal(activePawn(state)?.id, pawn.id)
          assert.equal(
            await page.getByRole('meter', { name: 'Energy' }).getAttribute('aria-valuemax'),
            '5',
          )
          assert.equal(
            await page.getByRole('meter', { name: 'Energy' }).getAttribute('aria-valuenow'),
            String(activePawn(state)!.energy),
          )
        }
        const round = state.round
        while (activePawn(state)?.id !== pawn.id || state.round === round) {
          await page.locator('[data-action="endTurn"]:not([disabled])').click()
          state = transition(state, { type: 'endTurn' }).state
        }
        assert.equal(
          await page.getByRole('meter', { name: 'Energy' }).getAttribute('aria-valuemax'),
          '3',
        )
        if (kind === 'watchtower') {
          const archer = activePawn(state)!
          const targets = state.pawns.filter((target) => canAttack(archer, target, tile))
          if (targets.length) {
            await page.locator('[data-action="attack"]').click()
            assert.equal(
              await page.getByRole('button', { name: /^Attack / }).count(),
              targets.length,
            )
            await page.locator('[data-action="attack"]').click()
          }
        }
      }
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
        true,
      )
      assert.equal(
        await page
          .locator('[data-testid="tile-face"]')
          .evaluateAll(
            (faces) => new Set(faces.map((face) => getComputedStyle(face).stroke)).size,
          ),
        1,
      )
      await page.reload()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      if (kind !== 'lava') assert.equal(await destination.getAttribute('data-feature'), kind)
    }
    await page.getByRole('button', { name: 'How to play' }).click()
    assert.match(await page.locator('dialog').innerText(), /two middle rows/)
    assert.match(await page.locator('dialog').innerText(), /no permanent bonus/)
    assert.deepEqual(errors, [])
  },
)

test(
  'Notifications expire in both motion modes and briefings stay dismissed until route remount',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion })
      await page.goto(origin + base + 'game/notification-lifecycle?mode=local')
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      const notifications = page.getByRole('list', { name: 'Recent battle events' })
      assert.equal(await notifications.getAttribute('aria-live'), 'polite')
      assert.equal(await notifications.getAttribute('aria-relevant'), 'additions')
      for (let turn = 0; turn < 2; turn++) {
        if (turn) await playTurn(page)
        const message = notifications.locator('li').first()
        await message.waitFor()
        assert.ok(await message.textContent())
        await message.waitFor({ state: 'detached' })
        assert.equal(await notifications.locator('li').count(), 0)
        assert.equal(await notifications.textContent(), '')
      }
    }

    await page.goto(origin + base + 'campaign/1')
    const briefing = page.getByRole('dialog', {
      name: CAMPAIGN_LEVELS[0].name,
      exact: true,
      includeHidden: true,
    })
    await briefing.waitFor()
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
    await briefing.waitFor({ state: 'hidden' })
    await playTurn(page)
    assert.equal(await briefing.getAttribute('open'), null)
    await page.getByRole('link', { name: 'Campaign levels', exact: true }).click()
    await briefing.waitFor({ state: 'detached' })
    await page.getByRole('link', { name: /^Level 1:/ }).click()
    await briefing.waitFor()
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
    await briefing.waitFor({ state: 'hidden' })
    await playTurn(page)
    assert.equal(await briefing.getAttribute('open'), null)
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
      const seed = 'juice-4'
      let state = botState(seed)
      await page.goto(origin + base + 'game/' + seed)
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      await page.evaluate(() => {
        const seen = new Set<Element>()
        const checks: unknown[] = []
        document.body.dataset.combatChecks = '[]'
        new MutationObserver(() => {
          const impacts = document.querySelector('[data-testid="combat-impacts"]')
          if (!impacts || seen.has(impacts)) return
          seen.add(impacts)
          const feedback = document.querySelector('[data-testid="combat-feedback"]')!
          const title = document.querySelector('[aria-current="step"]')!.getAttribute('title')!
          const labels = [...impacts.querySelectorAll('.combat-impact-label')]
          checks.push({
            labels: labels.map((label) => label.textContent!.trim()),
            animations: labels.map((label) => getComputedStyle(label).animationName),
            labelStyles: labels.map((label) => {
              const style = getComputedStyle(label)
              return [style.fontSize, style.fill, style.strokeWidth]
            }),
            burstsHidden: [...impacts.querySelectorAll('.combat-impact-burst')].every(
              (element) => getComputedStyle(element).display === 'none',
            ),
            side: title.startsWith('Enemy') ? 'enemy' : 'player',
            enemyBanner: !!document.querySelector('[data-testid="enemy-turn"]'),
            locked: (document.querySelector('[data-action="endTurn"]') as HTMLButtonElement)
              .disabled,
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
        const target = state.pawns.find((p) =>
          canAttack(pawn, p, state.tiles.get(pawn.q + ',' + pawn.r)),
        )
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
          if (action.type === 'endTurn') await page.locator('[data-action="endTurn"]').click()
          else if (action.type === 'act') await page.locator('[data-action="attack"]').click()
          else if (action.type === 'attackAt') {
            const tile = [...state.tiles.values()].findIndex(
              (tile) => tile.q === action.q && tile.r === action.r,
            )
            await page.locator('[data-testid="hex-tile"]').nth(tile).click()
          }
          state = result.state
          if (state.winner) await page.locator('[data-testid="battle-result"]').waitFor()
          else await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
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
        labelStyles: string[][]
        burstsHidden: boolean
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
        assert.equal(check.burstsHidden, reducedMotion === 'reduce')
        assert.deepEqual(
          check.labelStyles,
          check.labels.map((label) =>
            label === 'MISS'
              ? ['24px', 'rgb(201, 234, 244)', '5px']
              : ['32px', 'rgb(255, 225, 163)', '5px'],
          ),
        )
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
      assert.equal(await page.locator('[data-testid="combat-feedback"]').count(), 0)
    }
    assert.deepEqual(errors, [])
  },
)

test(
  'Local mode plays both armies offline on mobile, names either winner, and preserves mode for new games',
  { timeout: 90_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    await page.getByRole('link', { name: '2 players' }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'local')
    await playTurn(page)
    assert.equal(await page.locator('[data-testid="enemy-turn"]').count(), 0)
    await page.getByRole('button', { name: 'How to play' }).click()
    assert.match(await page.locator('dialog').innerText(), /Player 1 commands green units/)
    assert.match(await page.locator('dialog').innerText(), /Turn order is decided once/)
    assert.doesNotMatch(await page.locator('dialog').innerText(), /shuffles the order/)
    assert.doesNotMatch(
      await page.locator('dialog').innerText(),
      /Enemy units act automatically/,
    )
    await page.getByRole('button', { name: 'Close dialog' }).click()

    const winners = new Set<string>()
    const actionsBySide = new Set<string>()
    for (const seed of ['local-26', 'local-6']) {
      let state = initialState(seed)
      await page.goto(origin + base + 'game/' + seed + '?mode=local')
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      const first = activePawn(state)!
      assert.equal(
        await page.locator('[data-testid="player-turn"]').textContent(),
        playerNames[first.side] + ' turn',
      )
      assert.equal(
        await page.getByRole('meter', { name: 'Energy' }).getAttribute('aria-valuenow'),
        '3',
      )
      const opening = await page.locator('ol[aria-label="Round turn order"]').innerHTML()
      await page.reload()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(await page.locator('ol[aria-label="Round turn order"]').innerHTML(), opening)

      for (let step = 0; step < 100 && !state.winner; step++) {
        for (const action of chooseBotActions(state, huntTheKing)) {
          const pawn = activePawn(state)!
          assert.equal(
            await page.locator('[aria-current="step"]').getAttribute('title'),
            armyLabels.local[pawn.side] + ' ' + pawn.kind + ' #' + pawn.id,
          )
          assert.equal(
            await page.locator('[data-testid="player-turn"]').textContent(),
            playerNames[pawn.side] + ' turn',
          )
          actionsBySide.add(pawn.side + '-' + action.type)
          const result = transition(state, action)
          if (action.type === 'endTurn') await page.locator('[data-action="endTurn"]').click()
          else if (action.type === 'act')
            await page
              .locator(
                action.action === 'attack'
                  ? '[data-action="attack"]'
                  : '[data-action="special"]',
              )
              .click()
          else if ('q' in action) {
            const tile = [...state.tiles.values()].findIndex(
              (tile) => tile.q === action.q && tile.r === action.r,
            )
            await page.locator('[data-testid="hex-tile"]').nth(tile).click()
          } else assert.fail('Unexpected action: ' + action.type)
          state = result.state
          if (state.winner) await page.locator('[data-testid="battle-result"]').waitFor()
          else await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
        }
      }
      assert.ok(state.winner, 'The local battle must reach a winner')
      winners.add(state.winner)
      assert.equal(
        await page.locator('[data-testid="result-card"] h1').textContent(),
        playerNames[state.winner] + ' wins!',
      )
      assert.doesNotMatch(
        await page.locator('ol[aria-label="Recent battle events"]').innerText(),
        /Your |Enemy /,
      )
      assert.equal(await page.locator('[data-action="endTurn"]').isDisabled(), true)
      await page.getByRole('link', { name: 'New game' }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(new URL(page.url()).searchParams.get('mode'), 'local')
      assert.notEqual(new URL(page.url()).pathname, base + 'game/' + seed)
      await playTurn(page)
    }
    assert.deepEqual(winners, new Set(['player', 'enemy']))
    for (const side of ['player', 'enemy']) {
      assert.ok(actionsBySide.has(side + '-move'))
      assert.ok(actionsBySide.has(side + '-attackAt'))
    }
    await page.getByRole('link', { name: 'Hexmate home' }).click()
    await page.getByRole('link', { name: 'Quick play' }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'ai')
    assert.equal(await page.locator('[data-testid="player-turn"]').count(), 0)
    await playTurn(page)
    await page.goto(origin + base + 'game/local-26?mode=invalid')
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(await page.locator('[data-testid="player-turn"]').count(), 0)
    assert.match((await page.locator('[aria-current="step"]').getAttribute('title'))!, /^Your /)
    assert.deepEqual(errors, [])
  },
)

async function finishCampaignLevel(page: Page, id: number, surrender = false) {
  const level = CAMPAIGN_LEVELS[id - 1]
  let state = botState(level.seed, level.setup)
  await page.getByRole('button', { name: 'Go !', exact: true }).click()
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  assert.equal(
    await page.locator('[data-testid="battle-subtitle"]').textContent(),
    'Level ' + id + ' / 20',
  )
  for (let step = 0; step < 200 && !state.winner; step++) {
    const actions: Action[] = surrender ? [{ type: 'endTurn' }] : campaignActions(state)
    for (const action of actions) {
      const result = botTransition(state, action)
      if (action.type === 'endTurn') await page.locator('[data-action="endTurn"]').click()
      else if (action.type === 'act')
        await page
          .locator(
            action.action === 'attack' ? '[data-action="attack"]' : '[data-action="special"]',
          )
          .click()
      else if ('q' in action) {
        const tile = [...state.tiles.values()].findIndex(
          (tile) => tile.q === action.q && tile.r === action.r,
        )
        await page.locator('[data-testid="hex-tile"]').nth(tile).click()
      } else assert.fail('Unexpected campaign action: ' + action.type)
      state = result.state
      if (state.winner) await page.locator('[data-testid="battle-result"]').waitFor()
      else await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    }
  }
  assert.ok(state.winner)
  return state.winner
}

test(
  'Campaign saves wins offline, guards locked routes, retries losses and finishes at level twenty',
  { timeout: 150_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    await page.getByRole('link', { name: /^Campaign/ }).click()
    await page.locator('ol[aria-label="Campaign levels"]').waitFor()
    assert.equal(await page.locator('ol[aria-label="Campaign levels"] li').count(), 20)
    assert.equal(
      await page.locator('ol[aria-label="Campaign levels"] button:disabled').count(),
      19,
    )
    assert.equal(await page.locator('ol[aria-label="Campaign levels"] a').count(), 1)
    assert.equal(
      await page.evaluate(() => {
        const root = document.documentElement
        return (
          root.scrollWidth <= innerWidth &&
          root.scrollHeight <= innerHeight &&
          [...document.querySelectorAll('[data-testid="campaign-level"]')].every((element) => {
            const rect = element.getBoundingClientRect()
            return (
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= innerWidth &&
              rect.bottom <= innerHeight &&
              element.scrollHeight <= element.clientHeight
            )
          })
        )
      }),
      true,
      'All twenty campaign tiles must fit a small portrait viewport',
    )
    for (const level of ['2', '20', '0', '21', 'bad', '1.5', '01']) {
      await page.goto(origin + base + 'campaign/' + level)
      await page.locator('ol[aria-label="Campaign levels"]').waitFor()
      assert.equal(
        new URL(page.url()).pathname.replace(new RegExp('/$'), ''),
        base + 'campaign',
      )
      assert.equal(await page.locator('[data-biome]').count(), 0)
    }
    await page.getByRole('link', { name: /^Level 1:/ }).click()
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    const opening = await page.locator('[data-testid="battlefield"]').innerHTML()
    await page.reload()
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(await page.locator('[data-testid="battlefield"]').innerHTML(), opening)
    await page.getByRole('link', { name: 'Campaign levels', exact: true }).click()
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), CAMPAIGN_STORAGE_KEY),
      null,
    )
    await page.getByRole('link', { name: /^Level 1:/ }).click()
    assert.equal(await finishCampaignLevel(page, 1), 'player')
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), CAMPAIGN_STORAGE_KEY),
      '1',
    )
    await page.getByRole('link', { name: 'Next level' }).click()
    assert.equal(await finishCampaignLevel(page, 2, true), 'enemy')
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), CAMPAIGN_STORAGE_KEY),
      '1',
    )
    await page.getByRole('button', { name: 'Retry level' }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    const restarted = botState(CAMPAIGN_LEVELS[1].seed, CAMPAIGN_LEVELS[1].setup)
    const pawn = activePawn(restarted)!
    assert.equal(
      await page.locator('[aria-current="step"]').getAttribute('title'),
      'Your ' + pawn.kind + ' #' + pawn.id,
    )
    await page.getByRole('link', { name: 'Campaign levels', exact: true }).click()
    await page.getByRole('link', { name: /^Level 1:/ }).click()
    assert.equal(await finishCampaignLevel(page, 1), 'player')
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), CAMPAIGN_STORAGE_KEY),
      '1',
    )
    await page.getByRole('link', { name: 'Level selection' }).click()
    await page.locator('ol[aria-label="Campaign levels"]').waitFor()
    assert.equal(
      await page.locator('ol[aria-label="Campaign levels"] [data-status="completed"]').count(),
      1,
    )
    assert.equal(await page.locator('ol[aria-label="Campaign levels"] a').count(), 2)
    const reopened = await context.newPage()
    await reopened.goto(origin + base + 'campaign')
    await reopened.locator('ol[aria-label="Campaign levels"]').waitFor()
    assert.equal(await reopened.locator('ol[aria-label="Campaign levels"] a').count(), 2)
    await reopened.close()
    await page.evaluate((key) => localStorage.setItem(key, '19'), CAMPAIGN_STORAGE_KEY)
    await page.goto(origin + base + 'campaign/20')
    assert.equal(await finishCampaignLevel(page, 20), 'player')
    assert.equal(
      await page.locator('[data-testid="result-card"] h1').textContent(),
      'Campaign complete!',
    )
    assert.equal(await page.getByRole('link', { name: 'Next level' }).count(), 0)
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), CAMPAIGN_STORAGE_KEY),
      '20',
    )
    await page.getByRole('link', { name: 'Back to campaign' }).click()
    await page.locator('ol[aria-label="Campaign levels"]').waitFor()
    assert.equal(
      await page.locator('ol[aria-label="Campaign levels"] [data-status="completed"]').count(),
      20,
    )
    assert.equal(
      await page.locator('ol[aria-label="Campaign levels"] button:disabled').count(),
      0,
    )
    assert.ok(
      (await page.locator('[data-testid="campaign-progress"]').innerText()).includes(
        '20 / 20 completed',
      ),
    )
    assert.deepEqual(errors, [])
  },
)

test(
  'Campaign handles corrupt or unavailable local storage without losing the current session',
  { timeout: 90_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const value of ['garbage', '-1', '21', '1.5', '{}']) {
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
        key: CAMPAIGN_STORAGE_KEY,
        value,
      })
      await page.goto(origin + base + 'campaign')
      await page.locator('ol[aria-label="Campaign levels"]').waitFor()
      assert.equal(await page.locator('ol[aria-label="Campaign levels"] a').count(), 1)
    }
    for (const method of ['getItem', 'setItem'] as const) {
      const level = method === 'getItem' ? 2 : 1
      await page.evaluate(
        ({ key, completed }) => localStorage.setItem(key, String(completed)),
        { key: CAMPAIGN_STORAGE_KEY, completed: level - 1 },
      )
      await page.goto(origin + base + 'campaign')
      await page.locator('ol[aria-label="Campaign levels"]').waitFor()
      await page.evaluate((method) => {
        Storage.prototype[method] = () => {
          throw new DOMException('Storage blocked', 'SecurityError')
        }
      }, method)
      await page.getByRole('link', { name: new RegExp('^Level ' + level + ':') }).click()
      assert.equal(await finishCampaignLevel(page, level), 'player')
      if (method === 'setItem')
        assert.match(
          await page.locator('[data-testid="campaign-result-actions"]').innerText(),
          /Progress could not be saved/,
        )
      await page.getByRole('link', { name: 'Next level' }).click()
      await page.getByRole('button', { name: 'Go !', exact: true }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(
        await page.locator('[data-testid="battle-subtitle"]').textContent(),
        'Level ' + (level + 1) + ' / 20',
      )
      await page.goto(origin + base + 'campaign')
    }
    assert.deepEqual(errors, [])
  },
)

test(
  'Hybrid styling keeps responsive layouts, state colors, keyboard focus and native animations',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1280, height: 900 },
      { width: 900, height: 600 },
      { width: 800, height: 450 },
      { width: 359, height: 568 },
      { width: 360, height: 568 },
      { width: 600, height: 844 },
      { width: 601, height: 844 },
      { width: 900, height: 650 },
      { width: 900, height: 651 },
      { width: 600, height: 480 },
      { width: 600, height: 481 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto(origin + base + 'campaign')
      const levels = page.getByRole('list', { name: 'Campaign levels', exact: true })
      await levels.waitFor()
      assert.deepEqual(
        await levels.evaluate((element) => {
          const style = getComputedStyle(element)
          return [
            style.display,
            style.gridTemplateColumns.split(' ').length,
            style.gridTemplateRows.split(' ').length,
          ]
        }),
        ['grid', 4, 5],
      )
      const ready = page.getByRole('link', { name: /^Level 1:/ })
      const locked = page.getByRole('button', { name: /^Level 2:/ })
      assert.equal(
        await ready.evaluate((element) => getComputedStyle(element).borderColor),
        'rgb(220, 196, 138)',
      )
      assert.equal(
        await locked.evaluate((element) => getComputedStyle(element).opacity),
        '0.38',
      )
      await ready.click()
      const start = page.getByRole('button', { name: 'Go !', exact: true })
      await start.waitFor()
      assert.ok(
        await start.evaluate(
          (element) => element.getBoundingClientRect().bottom <= innerHeight,
        ),
      )
      await page.goto(origin + base + 'game/style-check12?mode=local')
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(
        await page.evaluate(() => {
          const root = document.documentElement
          return (
            root.scrollWidth <= innerWidth &&
            root.scrollHeight <= innerHeight &&
            ['[data-testid="battlefield"]', '[data-testid="command-deck"]'].every(
              (selector) => {
                const rect = document.querySelector(selector)!.getBoundingClientRect()
                return (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  rect.left >= 0 &&
                  rect.top >= 0 &&
                  rect.right <= innerWidth &&
                  rect.bottom <= innerHeight
                )
              },
            )
          )
        }),
        true,
        'The board and controls must fit portrait, desktop and short landscape viewports',
      )
      assert.equal(
        await page
          .locator('[aria-current="step"]')
          .evaluate((element) => getComputedStyle(element).color),
        'rgb(234, 217, 158)',
      )
      const shortLandscape = viewport.width >= 600 && viewport.height <= 480
      assert.equal(
        await page.getByRole('list', { name: 'Round turn order' }).isVisible(),
        !shortLandscape,
      )
      assert.equal(
        await page
          .locator('[data-action="endTurn"]')
          .evaluate((element) => getComputedStyle(element).minHeight),
        shortLandscape
          ? '48px'
          : viewport.height <= 650
            ? '65px'
            : viewport.width <= 600
              ? '76px'
              : '64px',
      )
      const styleBiome = (await page
        .locator('[data-biome]')
        .getAttribute('data-biome')) as Biome
      assert.equal(
        await page
          .getByRole('region', { name: 'The battlefield', exact: true })
          .evaluate((element) => getComputedStyle(element).backgroundSize),
        BIOMES[styleBiome].theme['--battlefield-size'] ?? 'auto, 8px 8px, auto',
      )
      const special = page.locator('[data-action="special"]')
      await special.click()
      await page.mouse.move(0, 0)
      assert.equal(await special.getAttribute('aria-pressed'), 'true')
      assert.equal(
        await special.evaluate((element) => getComputedStyle(element).backgroundColor),
        'rgba(159, 130, 185, 0.2)',
      )
      assert.equal(
        await special.evaluate((element) => getComputedStyle(element).borderColor),
        'rgb(196, 166, 219)',
      )
      assert.equal(await page.locator('[data-action="attack"]').isDisabled(), true)
      await special.click()
      await page.getByRole('button', { name: 'How to play' }).click()
      const dialog = page.getByRole('dialog')
      assert.ok(
        await dialog.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          return (
            rect.left >= 0 &&
            rect.right <= innerWidth &&
            rect.top >= 0 &&
            rect.bottom <= innerHeight
          )
        }),
      )
      await page.getByRole('button', { name: 'Close dialog' }).click()
    }
    await page.setViewportSize({ width: 320, height: 568 })
    const help = page.getByRole('button', { name: 'How to play' })
    await page.keyboard.press('Tab')
    await help.focus()
    assert.deepEqual(
      await help.evaluate((element) => {
        const style = getComputedStyle(element)
        return [style.outlineStyle, style.outlineWidth, style.outlineColor]
      }),
      ['solid', '2px', 'rgb(220, 196, 138)'],
    )
    const move = page.getByRole('button', { name: /^Move to / }).first()
    const face = move.locator('[data-testid="tile-face"]')
    const stroke = await face.evaluate((element) => getComputedStyle(element).stroke)
    await move.hover()
    assert.equal(
      await face.evaluate((element) => getComputedStyle(element).filter),
      'brightness(1.2)',
    )
    await move.focus()
    assert.equal(
      await face.evaluate((element) => getComputedStyle(element).fill),
      'rgb(241, 219, 156)',
    )
    assert.equal(await face.evaluate((element) => getComputedStyle(element).stroke), stroke)
    const chip = page.locator('[data-testid="pawn-chip"]').first()
    assert.equal(
      await chip.evaluate((element) => getComputedStyle(element).transitionProperty),
      'none',
    )
    const halo = page.locator('.pawn-active-halo')
    assert.equal(
      await halo.evaluate((element) => getComputedStyle(element).animationName),
      'none',
    )
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    assert.equal(
      await chip.evaluate((element) => getComputedStyle(element).transitionDuration),
      '0.35s',
    )
    assert.equal(
      await halo.evaluate((element) => getComputedStyle(element).animationName),
      'halo-breathe',
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (let turn = 0; turn < 4; turn++) {
      await playTurn(page)
      assert.equal(
        await page
          .locator('[aria-current="step"]')
          .evaluate((element) => getComputedStyle(element).color),
        'rgb(234, 217, 158)',
      )
    }
  },
)
