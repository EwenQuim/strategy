import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS, CAMPAIGN_STORAGE_KEY } from '../../src/campaign.ts'
import { base, fixture, sharedBrowser } from './fixture.ts'

test(
  'Menus fit mobile screens and use back links without a navbar',
  { timeout: 60_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    for (const viewport of [
      { width: 280, height: 480 },
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 601, height: 480 },
      { width: 899, height: 650 },
      { width: 900, height: 650 },
      { width: 900, height: 651 },
      { width: 1280, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      for (const path of ['', 'custom', 'campaign/original', 'achievements', 'settings']) {
        await page.goto(origin + base + path)
        const content = page.getByTestId('menu-content')
        await content.waitFor()
        assert.equal(await page.getByRole('navigation').count(), 0)
        assert.equal(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <= innerWidth &&
              document.documentElement.scrollHeight <= innerHeight,
          ),
          true,
          path + ' at ' + JSON.stringify(viewport),
        )
        assert.equal(
          await content.evaluate((element) => element.scrollWidth <= element.clientWidth),
          true,
          path,
        )
        if (path === '' || path === 'campaign/original')
          assert.equal(
            await content.evaluate((element) => element.scrollHeight <= element.clientHeight),
            true,
            path + ' must fit without scrolling',
          )
        if (path === 'campaign/original')
          assert.equal(
            await page.getByTestId('campaign-level').evaluateAll((levels) =>
              levels.every((level) => {
                const box = level.getBoundingClientRect()
                return (
                  box.width >= 44 &&
                  box.height >= 44 &&
                  level.scrollHeight <= level.clientHeight &&
                  box.top >= 0 &&
                  box.bottom <= innerHeight
                )
              }),
            ),
            true,
            'Every level must remain visible and tappable',
          )
        if (path === 'campaign/original' && viewport.width >= 900) {
          const levels = page.getByTestId('campaign-level')
          const first = await levels.first().boundingBox()
          const fifth = await levels.nth(4).boundingBox()
          assert.ok(first && fifth && first.y === fifth.y)
          if (viewport.height >= 900) {
            assert.ok(first.width >= 190 && first.height >= 160)
            assert.equal(
              await levels
                .first()
                .locator('span')
                .last()
                .evaluate((label) => getComputedStyle(label).fontSize),
              '14px',
            )
          }
        }
        if (path === 'custom') {
          const start = await page
            .getByRole('button', { name: 'Start battle', exact: true })
            .boundingBox()
          assert.ok(start && start.y >= 0 && start.y + start.height <= viewport.height)
        }
      }
    }
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(origin + base)
    await page.getByRole('heading', { name: 'Hexmate.', exact: true }).waitFor()
    const online = page.getByRole('link', { name: 'Online', exact: true })
    assert.equal(await online.getAttribute('aria-disabled'), 'true')
    assert.equal(await online.getAttribute('tabindex'), '-1')
    await online.click({ force: true })
    assert.equal(new URL(page.url()).pathname, base)
    await page.getByRole('link', { name: /^Tutorial/ }).click()
    await page.getByRole('heading', { name: 'Goal', exact: true }).waitFor()
    await page.keyboard.press('Escape')
    await page.getByRole('link', { name: 'Campaign levels', exact: true }).click()
    await page.getByRole('heading', { name: 'Hexmate.', exact: true }).waitFor()
    await page.getByRole('link', { name: 'Achievements', exact: true }).click()
    await page.getByRole('heading', { name: 'Achievements', exact: true }).waitFor()
    await page.getByRole('link', { name: 'Back to home' }).click()
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await page.getByRole('switch', { name: 'Developer preview', exact: true }).check()
    await page.reload()
    assert.equal(
      await page.getByRole('switch', { name: 'Developer preview', exact: true }).isChecked(),
      true,
    )
    await page.evaluate((key) => localStorage.setItem(key, '20'), CAMPAIGN_STORAGE_KEY)
    await page.getByRole('link', { name: 'Back to home' }).click()
    await page.getByRole('link', { name: /^Campaign/ }).click()
    await page.getByRole('heading', { name: 'Campaigns', exact: true }).waitFor()
    assert.equal(await page.getByTestId('campaign-pack').count(), CAMPAIGNS.length)
    await page.setViewportSize({ width: 1440, height: 900 })
    const desktopPack = await page.getByTestId('campaign-pack').first().boundingBox()
    assert.ok(desktopPack && desktopPack.width >= 320 && desktopPack.height >= 260)
    await page.setViewportSize({ width: 320, height: 568 })
    const lastPack = page.getByTestId('campaign-pack').last()
    await lastPack.scrollIntoViewIfNeeded()
    assert.equal(
      await lastPack.evaluate((pack) => {
        const box = pack.getBoundingClientRect()
        return box.top >= 0 && box.bottom <= innerHeight
      }),
      true,
    )
    await page.getByRole('link', { name: /^Original campaign/ }).click()
    await page.getByRole('link', { name: 'Back to campaigns' }).click()
    await page.getByRole('heading', { name: 'Campaigns', exact: true }).waitFor()
    await page.getByRole('link', { name: 'Back to home' }).click()
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await page.getByRole('switch', { name: 'Developer preview', exact: true }).uncheck()
    await page.getByRole('link', { name: 'Back to home' }).click()
    await page.getByRole('link', { name: /^Campaign/ }).click()
    await page.getByRole('heading', { name: 'Campaigns', exact: true }).waitFor()
    assert.equal(
      await page.getByTestId('campaign-pack').count(),
      CAMPAIGNS.filter((pack) => !pack.developerPreview).length,
    )
    await page.getByRole('link', { name: /^Original campaign/ }).click()
    await page.getByRole('link', { name: /^Level 1:/ }).click()
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
    assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).count(), 0)
    await page.getByRole('link', { name: 'Campaign levels', exact: true }).click()
    await page.getByTestId('menu-content').waitFor()
    assert.equal(await page.getByRole('navigation').count(), 0)
    assert.deepEqual(errors, [])
  },
)

test('Menu labels and controls fit all supported languages', { timeout: 60_000 }, async (t) => {
  const { origin } = await fixture(t)
  const browser = await sharedBrowser!
  for (const locale of ['en', 'fr', 'de', 'es', 'it']) {
    const context = await browser.newContext({
      locale,
      serviceWorkers: 'block',
      viewport: { width: 280, height: 480 },
      reducedMotion: 'reduce',
    })
    try {
      const page = await context.newPage()
      for (const path of ['', 'settings', 'achievements', 'custom', 'campaign']) {
        await page.goto(origin + base + path)
        const content = page.getByTestId('menu-content')
        await content.waitFor()
        assert.equal(await page.getByRole('navigation').count(), 0)
        assert.equal(
          await content.evaluate((element) => element.scrollWidth <= element.clientWidth),
          true,
          locale + '/' + path,
        )
        assert.equal(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <= innerWidth &&
              document.documentElement.scrollHeight <= innerHeight,
          ),
          true,
        )
      }
    } finally {
      await context.close()
    }
  }
})

test(
  'Game layout fits responsive viewports and preserves keyboard focus and reduced motion',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const viewports = [
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
    ]
    await page.goto(origin + base + 'game/style-check?mode=local')
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
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
    }
    await page.getByRole('button', { name: 'How to play' }).click()
    const dialog = page.getByRole('dialog')
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
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
    }
    await page.getByRole('button', { name: 'Close dialog' }).click()
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
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    assert.equal(
      await chip.evaluate((element) => getComputedStyle(element).transitionDuration),
      '0.35s',
    )
  },
)
