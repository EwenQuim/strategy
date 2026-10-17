import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import {} from 'playwright-core'
import { initialState, type Biome } from '../../src/lib/engine/index.ts'
import { biomeNames } from '../../src/i18n/biomes.ts'
import {
  base,
  polling,
  fixture,
  dismissQuickPlayTutorial,
  playTurn,
  readBuildLabel,
  releaseMarker,
} from './fixture.ts'

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
      cwd: new URL('../../', import.meta.url),
      encoding: 'utf8',
      timeout: 5_000,
    }).trim()
    assert.equal(await readBuildLabel(page), 'Build ' + commit)
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
    await dismissQuickPlayTutorial(page)
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
      (appRegistration) =>
        appRegistration.waiting?.state === 'installed' &&
        appRegistration.active?.state === 'activated',
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
      await probe.evaluate((appRegistration) => appRegistration.waiting?.state, registration),
      'installed',
      'Another open tab must keep the previous release active',
    )
    assert.ok((await probe.evaluate(() => caches.keys())).includes(cacheName))
    await other.close()
    await probe.waitForFunction(
      (appRegistration) =>
        appRegistration.waiting === null && appRegistration.active?.state === 'activated',
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
  'The install suggestion follows beforeinstallprompt and disappears once used',
  { timeout: 30_000 },
  async (t) => {
    const { page } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    assert.equal(await page.locator('#pwa-install').count(), 0)
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt')
      Object.defineProperty(event, 'prompt', {
        value: () => {
          ;(globalThis as typeof globalThis & { prompted?: boolean }).prompted = true
          return Promise.resolve()
        },
      })
      window.dispatchEvent(event)
    })
    const notice = page.locator('#pwa-install')
    await notice.waitFor()
    assert.match(await notice.innerText(), /offline play/)
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
      'The install notice must fit a small portrait viewport',
    )
    await page.getByRole('button', { name: 'Install', exact: true }).click()
    await notice.waitFor({ state: 'hidden' })
    assert.equal(
      await page.evaluate(
        () => (globalThis as typeof globalThis & { prompted?: boolean }).prompted,
      ),
      true,
    )
    assert.deepEqual(errors, [])
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
    await dismissQuickPlayTutorial(offline)
    await playTurn(offline)
    assert.equal(await releaseMarker(offline), undefined)
  },
)

test(
  'New games reach all four biomes offline and retain the build label on a small portrait screen',
  { timeout: 60_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const buildLabel = await readBuildLabel(page)
    const modes = page.getByRole('group', { name: 'Choose game mode' }).getByRole('link')
    assert.equal(
      await modes.first().locator('svg polygon').count(),
      0,
      'The home campaign button must not contain a map preview',
    )
    assert.equal(
      new URL((await modes.nth(2).getAttribute('href'))!, page.url()).pathname,
      base + 'custom',
    )
    assert.equal(
      new URL((await modes.nth(3).getAttribute('href'))!, page.url()).pathname,
      base + 'online',
    )
    for (const viewport of [
      { width: 280, height: 480 },
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
      assert.equal(await page.getByRole('navigation').count(), 0)
      const achievements = await page
        .getByRole('link', { name: 'Achievements', exact: true })
        .boundingBox()
      const settings = await page
        .getByRole('link', { name: 'Settings', exact: true })
        .boundingBox()
      assert.ok(achievements && settings)
      assert.equal(achievements.y, settings.y)
      assert.ok(achievements.y > boxes[3].bottom)
      assert.ok(settings.y + settings.height <= viewport.height)
      assert.equal(
        await modes.first().evaluate((link) => getComputedStyle(link).fontSize),
        viewport.height <= 650 ? '14px' : '16px',
      )
      assert.equal(boxes[0].width, Math.min(360, viewport.width - 40))
      if (viewport.height > 650) assert.ok(boxes[0].height >= 56)
      for (const [index, box] of boxes.entries()) {
        assert.equal(box.left, boxes[0].left)
        assert.equal(box.width, boxes[0].width)
        if (index > 0) assert.ok(box.top > boxes[index - 1].bottom)
        assert.ok(box.height >= 44)
        assert.ok(box.left >= 0 && box.right <= viewport.width)
        assert.ok(box.top >= 0 && box.bottom <= viewport.height)
        for (const other of boxes.slice(0, index))
          assert.ok(
            box.left >= other.right ||
              box.right <= other.left ||
              box.top >= other.bottom ||
              box.bottom <= other.top,
          )
      }
    }
    await page.setViewportSize({ width: 844, height: 390 })
    assert.ok(
      (await page.getByRole('heading', { name: 'Hexmate.', exact: true }).boundingBox())!.y >=
        0,
    )
    const settingsInLandscape = await page
      .getByRole('link', { name: 'Settings', exact: true })
      .boundingBox()
    assert.ok(settingsInLandscape && settingsInLandscape.y + settingsInLandscape.height <= 390)
    await page.setViewportSize({ width: 320, height: 568 })
    const backgrounds = new Set<string>()
    const panels = new Set<string>()
    const tileBases = new Set<string>()
    const seeds = new Map<Biome, string>()
    for (let index = 0; index < 100 && seeds.size < 4; index++) {
      const seed = '00000000-0000-4000-8000-' + index.toString(16).padStart(12, '0')
      seeds.set(initialState(seed).biome, seed)
    }
    assert.equal(seeds.size, 4)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    for (const [biome, seed] of seeds) {
      await page.goto(origin + base)
      assert.equal(await readBuildLabel(page), buildLabel)
      await page.evaluate((battleSeed) => {
        Object.defineProperty(crypto, 'randomUUID', { value: () => battleSeed })
      }, seed)
      await page.getByRole('link', { name: 'Quick play' }).click()
      await dismissQuickPlayTutorial(page)
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(new URL(page.url()).pathname, base + 'game/' + seed)
      assert.equal(await page.locator('[data-action="special"]').isVisible(), true)
      assert.equal(await page.locator('[data-action]').count(), 2)
      assert.equal(
        await page.locator('[data-testid="battle-subtitle"]').textContent(),
        biomeNames[biome],
      )
      assert.equal(
        await page.locator('[data-testid="hex-tile"]').count(),
        initialState(seed).tiles.size,
      )
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
        terrain.some((label) => label.includes('Lake')),
        biome === 'verdant' || biome === 'desert',
      )
      assert.equal(
        terrain.some((label) => label.includes('Mountain')),
        biome === 'mountains',
      )
      assert.equal(
        terrain.some((label) => label.includes('Sand')),
        biome === 'desert',
      )
      if (biome === 'desert') {
        assert.ok(terrain.every((label) => /Sand|Palm|Lake|health/.test(label)))
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
        assert.ok(terrain.some((label) => label.includes('Lava')))
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
