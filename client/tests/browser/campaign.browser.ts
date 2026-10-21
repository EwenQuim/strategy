import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  initialState,
  hazardDamage,
  hellfireCenters,
  activePawn,
  specialTargetingTiles,
  specialTargets,
  walkingPaths,
  hexDist,
  passable,
  movementDestinations,
} from '../../src/lib/engine/index.ts'
import { transition } from '../../src/lib/engine/engine.ts'
import { unitNames } from '../../src/i18n/units.ts'
import { CAMPAIGNS, CAMPAIGN_STORAGE_KEY } from '../../src/campaign.ts'
import { campaignBot } from '../../src/bots/campaign.ts'
import {
  battleIdentity,
  BATTLE_SNAPSHOT_VERSION,
  snapshotState,
} from '../../src/lib/battleSnapshot.ts'
import { DEFAULT_BOT_CONFIG } from '../../src/bots/catalog.ts'
import { victoryActions } from '../campaign-replays.ts'
import {
  base,
  fixture,
  playInUi,
  playTurn,
  finishCampaignLevel,
  sharedBrowser,
  dismissTour,
} from './fixture.ts'

test(
  'Campaign showcases volcanic terrain and each special tile with subdued, readable tile art',
  { timeout: 30_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.evaluate((key) => localStorage.setItem(key, '20'), CAMPAIGN_STORAGE_KEY)
    await context.setOffline(true)
    for (const id of [5, 13, 14, 15, 18]) {
      const level = CAMPAIGNS[1].levels[id - 1]
      await page.goto(origin + base + 'campaign/original/' + id)
      if (level.newElements.length > 0)
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
            '[data-testid="hex-tile"][data-terrain=basalt][role=img][aria-label^="Basalt,"] [data-testid="tile-face"]',
          )
          .first()
        const lava = page
          .locator(
            '[data-testid="hex-tile"][data-terrain=lava][role=img][aria-label^="Lava,"] [data-testid="tile-face"]',
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
          await page
            .getByTestId('battlefield')
            .locator('[data-art="lava"] > g[clip-path="url(#lava-hex)"]')
            .count(),
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
  'Hell campaign warnings fit compact layouts and show round-end impacts in both motion modes',
  { timeout: 60_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.evaluate((key) => localStorage.setItem(key, '20'), CAMPAIGN_STORAGE_KEY)
    await context.setOffline(true)

    async function checkWarnings(state: ReturnType<typeof initialState>) {
      assert.deepEqual(
        await page.getByTestId('hex-tile').evaluateAll((elements) =>
          elements.map((element) => ({
            warned: element.hasAttribute('data-hellfire'),
            center: element.hasAttribute('data-hellfire-center'),
            hatch:
              element.querySelector('polygon[fill="url(#hellfire-hatch)"]')?.parentElement
                ?.children.length === 1,
            described:
              /Hellfire (impact center|blast area), 1 unavoidable damage at round end$/.test(
                element.getAttribute('aria-label')!,
              ),
          })),
        ),
        [...state.tiles.values()].map((tile) => ({
          warned: hazardDamage(state.hazards, tile) > 0,
          center: hellfireCenters(state.hazards).some(
            (center) => center.q === tile.q && center.r === tile.r,
          ),
          hatch: hazardDamage(state.hazards, tile) > 0,
          described: hazardDamage(state.hazards, tile) > 0,
        })),
      )
    }

    const level = CAMPAIGNS[1].levels[16]
    await page.goto(origin + base + 'campaign/original/17')
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(await page.locator('[data-biome]').getAttribute('data-biome'), 'hell')
    await checkWarnings(initialState(level.seed, level.setup))
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 1280, height: 900 },
      { width: 600, height: 480 },
    ]) {
      await page.setViewportSize(viewport)
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight &&
            ['game-header', 'battlefield', 'command-deck'].every((id) => {
              const rect = document
                .querySelector('[data-testid="' + id + '"]')!
                .getBoundingClientRect()
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                rect.left >= 0 &&
                rect.top >= 0 &&
                rect.right <= innerWidth &&
                rect.bottom <= innerHeight
              )
            }),
        ),
        true,
        'Hell warnings and controls must fit ' + JSON.stringify(viewport),
      )
    }

    const setup = { biome: 'hell', player: ['king'], enemy: ['king'] } as const
    const seed = 'hellfire-ui'
    const url =
      origin +
      base +
      'game/' +
      seed +
      '?mode=local&setup=' +
      encodeURIComponent(JSON.stringify(setup))
    const endTurn = page.locator('[data-action="endTurn"]:not([disabled])')
    await page.setViewportSize({ width: 320, height: 568 })
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion })
      await page.goto(url)
      await endTurn.waitFor()
      await checkWarnings(initialState(seed, setup))
      const move = page.getByRole('button', { name: /^Move to .*Hellfire/ }).first()
      assert.equal(await move.getByTestId('tile-face').getAttribute('fill'), 'var(--move-tint)')
      assert.deepEqual(
        await move.locator('polygon[fill="url(#hellfire-hatch)"]').evaluate((element) => ({
          animation: getComputedStyle(element).animationName,
          pointerEvents: getComputedStyle(element.parentElement!).pointerEvents,
        })),
        { animation: 'none', pointerEvents: 'none' },
      )
      await endTurn.click()
      await endTurn.waitFor()
      await endTurn.click()
      await page.getByTestId('hellfire-effect').first().waitFor()
      assert.deepEqual(
        await page.locator('[data-kind="hellfire"]').evaluate((element) => ({
          centers: element.querySelectorAll('[data-testid="hellfire-effect"]').length,
          trails: element.querySelectorAll('line').length,
          animation: getComputedStyle(
            element.querySelector('[data-testid="hellfire-effect"] > g')!,
          ).animationName,
          damage: [...document.querySelectorAll('[data-testid="combat-impacts"] text')].map(
            (label) => label.textContent,
          ),
          locked: (document.querySelector('[data-action="endTurn"]') as HTMLButtonElement)
            .disabled,
        })),
        {
          centers: 2,
          trails: 0,
          animation: reducedMotion === 'reduce' ? 'none' : 'hellfire-fall',
          damage: ['-1', '-1'],
          locked: true,
        },
      )
      await endTurn.waitFor()
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
      for (let index = 0; index < 10_000 && !position; index++) {
        // Mirrored rosters open on the kings, so walk the first round until a
        // matching pawn can reach the tile.
        let candidate = initialState('interactive-ui-' + kind + '-' + index)
        for (let turn = 0; turn < candidate.order.length && !position; turn++) {
          const pawn = activePawn(candidate)!
          // The aimed-shot assertion below is archer-specific: only its special
          // targets map one button per enemy.
          const wanted = kind === 'lava' ? 'ninja' : kind === 'watchtower' ? 'archer' : null
          if (wanted === null || pawn.kind === wanted) {
            position = [...movementDestinations(candidate.tiles, candidate.pawns, pawn)].find(
              ([k, cost]) => {
                if (!cost) return false
                const tile = candidate.tiles.get(k)!
                if (kind === 'lava') return tile.terrain === 'lava'
                return tile.feature === kind
              },
            )?.[0]
            if (position) state = candidate
          }
          if (!position) candidate = transition(candidate, { type: 'endTurn' }).state
        }
      }
      assert.ok(position, 'Find a reachable ' + kind)
      const pawn = activePawn(state)!
      const tile = state.tiles.get(position)!
      const index = [...state.tiles.keys()].indexOf(position)
      if (kind === 'lava') {
        // Ambush needs a victim beside the landing, off the walking path so the
        // lava tile keeps its lethal move warning.
        const path = new Set<string>()
        let step = walkingPaths(state.tiles, state.pawns, pawn).get(position)
        while (step) {
          if (step.tile) path.add(step.key)
          step = step.parent ?? undefined
        }
        const victimAt = [...state.tiles.values()].find(
          (at) =>
            hexDist(at, tile) === 1 &&
            passable(at) &&
            !path.has(at.q + ',' + at.r) &&
            !state.pawns.some((p) => p.q === at.q && p.r === at.r),
        )!
        assert.ok(victimAt)
        const victim = state.pawns.find((p) => p.side !== pawn.side)!
        Object.assign(victim, { q: victimAt.q, r: victimAt.r })
        assert.ok(specialTargetingTiles(pawn, state.tiles, state.pawns).has(position))
      }
      // The battle opens on the kings, so restore the advanced state instead of
      // a fresh one that would not start on the acting pawn.
      await page.evaluate(
        (saved) => localStorage.setItem('hexmate.battle', JSON.stringify(saved)),
        {
          version: BATTLE_SNAPSHOT_VERSION,
          identity: battleIdentity('local', state.seed, DEFAULT_BOT_CONFIG, undefined),
          state: snapshotState(state),
        },
      )
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
        // Canceling the aim quiets the board, so walking into the lava needs Move back.
        await page.locator('[data-action="move"]').click()
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
      if (kind === 'lava') {
        const fallen = page.locator('[data-fallen="true"]')
        await fallen.waitFor()
        const message = page.getByTestId('killed-message')
        assert.equal(await message.textContent(), 'Killed')
        assert.equal(
          await message.evaluate((element) => getComputedStyle(element).animationName),
          'none',
        )
        assert.equal(
          await fallen.evaluate((element) => getComputedStyle(element).animationName),
          'none',
        )
      }
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
            await page.locator(`[data-pawn="${pawn.id}"] [data-kind="energy"]`).count(),
            5,
          )
          assert.equal(
            await page
              .locator(`[data-pawn="${pawn.id}"] [data-kind="energy"][data-filled="true"]`)
              .count(),
            activePawn(state)!.energy,
          )
        }
        const round = state.round
        while (activePawn(state)?.id !== pawn.id || state.round === round) {
          await page.locator('[data-action="endTurn"]:not([disabled])').click()
          state = transition(state, { type: 'endTurn' }).state
        }
        // The rune buff expires with the round: the active pawn is back to three pips.
        assert.equal(
          await page.locator(`[data-pawn="${pawn.id}"] [data-kind="energy"]`).count(),
          3,
        )
        if (kind === 'watchtower') {
          // The archer shoots from the watchtower, so its range bonus applies.
          const archer = activePawn(state)!
          const targets = specialTargets(
            state.pawns,
            archer,
            state.tiles.get(archer.q + ',' + archer.r)!,
          )
          if (targets.length) {
            await page.locator('[data-action="special"]').click()
            // The ability button keeps its name while aiming, so count only board tiles.
            assert.equal(
              await page
                .getByTestId('battlefield')
                .getByRole('button', { name: /^Shot / })
                .count(),
              targets.length,
            )
            await page.locator('[data-action="special"]').click()
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
      if (kind !== 'lava')
        // Reloading resumes the recorded battle, so a consumed rune stays consumed.
        assert.equal(
          await destination.getAttribute('data-feature'),
          kind === 'rune' ? null : kind,
        )
    }
    await page.getByRole('button', { name: 'How to play' }).click()
    // The feature rules live behind the help dialog's Terrain tab.
    await page.getByRole('dialog').getByRole('tab', { name: 'Terrain' }).click()
    assert.match(await page.locator('dialog').innerText(), /Stay until next turn: \+1 HP/)
    assert.match(
      await page.locator('dialog').innerText(),
      /First unit in: \+2 energy this round/,
    )
    assert.deepEqual(errors, [])
  },
)

test(
  'The tutorial tour and briefing reveals fit mobile screens and stay accessible',
  { timeout: 90_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.evaluate((key) => localStorage.setItem(key, '20'), CAMPAIGN_STORAGE_KEY)
    const tour = page.getByRole('dialog', { name: 'Quick tour' })
    for (const viewport of [
      { width: 280, height: 480 },
      { width: 320, height: 568 },
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 601, height: 480 },
      { width: 900, height: 480 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto(origin + base + 'campaign/tutorial/1')
      await tour.waitFor()
      // The tour pauses the battle until the player completes it.
      assert.equal(await page.locator('[data-action="endTurn"]').isDisabled(), true)
      assert.equal(await tour.getByRole('button', { name: 'Previous', exact: true }).count(), 0)
      for (const name of [
        'Turn order',
        'Your king',
        'Enemy king',
        'Move',
        'Special ability',
        'End turn',
      ]) {
        await tour.getByRole('heading', { name, exact: true }).waitFor()
        assert.equal(
          await tour.evaluate((dialog) => {
            const card = dialog.querySelector('.tour-card')!
            const box = card.getBoundingClientRect()
            return (
              box.x >= 0 &&
              box.y >= 0 &&
              box.right <= innerWidth &&
              box.bottom <= innerHeight &&
              card.scrollWidth <= card.clientWidth &&
              document.documentElement.scrollWidth <= innerWidth &&
              document.documentElement.scrollHeight <= innerHeight &&
              [...card.querySelectorAll('button')].every((button) => {
                const rect = button.getBoundingClientRect()
                return (
                  rect.x >= box.x &&
                  rect.right <= box.right &&
                  rect.y >= box.y &&
                  rect.bottom <= box.bottom
                )
              })
            )
          }),
          true,
          name + ' at ' + JSON.stringify(viewport),
        )
        assert.equal(
          await tour.evaluate((dialog) => dialog.getAnimations({ subtree: true }).length),
          0,
        )
        if (name !== 'End turn')
          await tour.getByRole('button', { name: 'Next', exact: true }).click()
      }
      await tour.getByRole('button', { name: 'Go !', exact: true }).click()
      await tour.waitFor({ state: 'hidden' })
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    }
    await page.setViewportSize({ width: 320, height: 568 })
    const briefing = page.getByRole('dialog', { name: 'Battle briefing', exact: true })
    for (const level of CAMPAIGNS[1].levels.filter(
      (candidate) => candidate.id > 1 && candidate.newElements.length > 0,
    )) {
      await page.goto(origin + base + 'campaign/original/' + level.id)
      await briefing.waitFor()
      assert.equal(
        await briefing.getByRole('navigation').count(),
        Number(level.newElements.length > 1),
      )
      assert.equal(await briefing.getByRole('heading', { level: 3 }).count(), 1)
      assert.equal(
        await briefing.evaluate(
          (dialog) => dialog.querySelector('section')!.scrollWidth <= dialog.clientWidth,
        ),
        true,
      )
      assert.equal(
        await briefing.evaluate((dialog) =>
          [...dialog.querySelectorAll('[aria-hidden="true"]')].some((art) =>
            getComputedStyle(art).backgroundImage.includes('radial-gradient'),
          ),
        ),
        true,
      )
      await page.keyboard.press('Escape')
      await briefing.waitFor({ state: 'hidden' })
    }
    await page.goto(origin + base + 'campaign/original/11')
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(await briefing.count(), 0)
    assert.deepEqual(errors, [])
  },
)

test(
  'The tutorial tour supports every locale, keyboard dismissal and reduced motion',
  { timeout: 60_000 },
  async (t) => {
    const { origin } = await fixture(t)
    const browser = await sharedBrowser!
    for (const locale of ['en', 'fr', 'de', 'es', 'it']) {
      const context = await browser.newContext({
        locale,
        serviceWorkers: 'block',
        viewport: { width: 320, height: 568 },
        reducedMotion: 'reduce',
      })
      try {
        const page = await context.newPage()
        await page.goto(origin + base + 'campaign/tutorial/1')
        const tour = page.getByRole('dialog')
        await tour.waitFor()
        // The card focuses its Next button, so the Enter key steps the tour in every locale.
        for (let step = 0; step < 5; step++) {
          assert.equal(
            await tour.evaluate((dialog) => {
              const card = dialog.querySelector('.tour-card')!
              return (
                card.scrollWidth <= card.clientWidth &&
                document.documentElement.scrollWidth <= innerWidth
              )
            }),
            true,
            locale + ' step ' + step,
          )
          await page.keyboard.press('Enter')
        }
        // The card focuses its own button, so the Escape key can dismiss the tour.
        assert.equal(
          await tour.evaluate((dialog) => dialog.contains(document.activeElement)),
          true,
          locale,
        )
        await page.keyboard.press('Escape')
        await tour.waitFor({ state: 'hidden' })
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.goto(origin + base + 'campaign/tutorial/1')
        await tour.waitFor()
        assert.ok(
          (await tour.evaluate((dialog) => dialog.getAnimations({ subtree: true }).length)) > 0,
          locale,
        )
      } finally {
        await context.close()
      }
    }
  },
)

test(
  'Campaign briefings pause fresh and restored battles until the player is ready',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const level = CAMPAIGNS[1].levels[0]
    const opening = initialState(level.seed, level.setup, 'player')
    const readSavedState = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('hexmate.battle')!).state)
    await page.goto(origin + base + 'campaign/original/1')
    const briefing = page.getByRole('dialog', { name: 'Battle briefing', exact: true })
    await briefing.waitFor()
    await page.waitForFunction(() => localStorage.getItem('hexmate.battle'))
    const savedOpening = await readSavedState()
    assert.deepEqual(savedOpening, JSON.parse(JSON.stringify(snapshotState(opening))))
    await page.waitForTimeout(1500)
    assert.deepEqual(await readSavedState(), savedOpening)
    assert.equal(await page.locator('[data-action="endTurn"]').isDisabled(), true)
    await briefing.getByRole('button', { name: 'Go !', exact: true }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    await page.waitForTimeout(1000)
    assert.deepEqual(await readSavedState(), savedOpening)
    await page.locator('[data-action="endTurn"]').click()
    await page.getByTestId('enemy-turn').waitFor()
    assert.match(
      (await page
        .locator('[data-testid="initiative-unit"][aria-current="step"]')
        .getAttribute('title')) ?? '',
      /Enemy Archer/,
    )
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.notDeepEqual(await readSavedState(), savedOpening)

    // A reload during an enemy activation must also wait behind the briefing.
    const enemyTurn = transition(opening, { type: 'endTurn' }).state
    const saved = {
      version: BATTLE_SNAPSHOT_VERSION,
      identity: battleIdentity('ai', level.seed, campaignBot(CAMPAIGNS[1], level), level.setup),
      state: snapshotState(enemyTurn),
    }
    await page.getByRole('link', { name: 'Campaign levels', exact: true }).click()
    await page.evaluate(
      (snapshot) => localStorage.setItem('hexmate.battle', JSON.stringify(snapshot)),
      saved,
    )
    await page.goto(origin + base + 'campaign/original/1')
    await briefing.waitFor()
    await page.waitForTimeout(1500)
    assert.deepEqual(await readSavedState(), JSON.parse(JSON.stringify(saved.state)))
    await page.keyboard.press('Escape')
    await briefing.waitFor({ state: 'hidden' })
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.notDeepEqual(await readSavedState(), JSON.parse(JSON.stringify(saved.state)))
  },
)

test(
  'A newly discovered Magician burns the default aligned army after the player opening',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const level = CAMPAIGNS[1].levels[1]
    const opening = initialState(level.seed, level.setup, 'player')
    const aligned = opening.pawns.filter((p) => p.side === 'player' && p.kind !== 'king')
    await page.evaluate((key) => localStorage.setItem(key, '1'), CAMPAIGN_STORAGE_KEY)
    await page.goto(origin + base + 'campaign/original/2')
    const briefing = page.getByRole('dialog', { name: 'Battle briefing', exact: true })
    await briefing.waitFor()
    await page.waitForTimeout(1000)
    assert.equal(await page.getByTestId('enemy-turn').count(), 0)
    await briefing.getByRole('button', { name: 'Go !', exact: true }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    await page.locator('[data-action="endTurn"]').click()
    await page.getByTestId('enemy-turn').waitFor()
    await page.getByTestId('combat-feedback').waitFor({ state: 'attached' })
    assert.match(
      (await page
        .locator('[data-testid="initiative-unit"][aria-current="step"]')
        .getAttribute('title')) ?? '',
      /Enemy Magician/,
    )
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem('hexmate.battle')!).state,
    )
    for (const pawn of aligned) {
      const survivor = saved.pawns.find((p: { id: number }) => p.id === pawn.id)
      assert.equal(survivor.hp, pawn.hp - 1)
      assert.equal(survivor.q, pawn.q)
      assert.equal(survivor.r, pawn.r)
    }
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  },
)

test(
  'Brutal uses its authored bot configuration when playing and restoring a battle',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const pack = CAMPAIGNS.find((candidate) => candidate.slug === 'brutal')!
    const level = pack.levels[0]
    await page.evaluate((key) => localStorage.setItem(key, '10'), CAMPAIGN_STORAGE_KEY)
    await page.goto(origin + base + 'campaign/brutal/1')
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    const readSaved = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('hexmate.battle')!))
    const saved = await readSaved()
    assert.deepEqual(JSON.parse(saved.identity.bot), campaignBot(pack, level))
    await playTurn(page)
    const updated = await readSaved()
    assert.notDeepEqual(updated.state, saved.state)
    await page.reload()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.deepEqual(await readSaved(), updated)
  },
)

test('Briefings stay dismissed until route remount', { timeout: 60_000 }, async (t) => {
  const { page, origin } = await fixture(t)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.evaluate((key) => localStorage.setItem(key, '2'), CAMPAIGN_STORAGE_KEY)
  await page.goto(origin + base + 'campaign/original/3')
  const briefing = page.getByRole('dialog', {
    name: 'Battle briefing',
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
  await page.getByRole('link', { name: /^Level 3:/ }).click()
  await briefing.waitFor()
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await briefing.waitFor({ state: 'hidden' })
  await playTurn(page)
  assert.equal(await briefing.getAttribute('open'), null)
  assert.deepEqual(errors, [])
})

test(
  'Brutal victories never show recruit unlock notifications, including first clears and reloads',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const pack = CAMPAIGNS.find((candidate) => candidate.slug === 'brutal')!
    await page.evaluate((key) => localStorage.setItem(key, '10'), CAMPAIGN_STORAGE_KEY)
    for (const level of pack.levels.filter((candidate) => candidate.unlocks.length)) {
      await page.goto(origin + base)
      const actions = victoryActions(level)
      let state = initialState(level.seed, level.setup, 'player')
      for (const action of actions.slice(0, -1)) state = transition(state, action).state
      assert.equal(state.winner, null)
      assert.equal(activePawn(state)?.side, 'player')
      const saved = {
        version: BATTLE_SNAPSHOT_VERSION,
        identity: battleIdentity('ai', level.seed, campaignBot(pack, level), level.setup),
        state: snapshotState(state),
      }
      await page.evaluate(
        (snapshot) => localStorage.setItem('hexmate.battle', JSON.stringify(snapshot)),
        saved,
      )
      await page.goto(origin + base + 'campaign/brutal/' + level.id)
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      await playInUi(page, state, actions.at(-1)!)
      await page.getByTestId('battle-result').waitFor()
      assert.equal(
        await page.getByTestId('unit-unlock-toast').count(),
        0,
        `First clear ${level.id}`,
      )
      await page.reload()
      await page.getByTestId('battle-result').waitFor()
      assert.equal(await page.getByTestId('unit-unlock-toast').count(), 0, `Reload ${level.id}`)
    }
  },
)

test(
  'Signature victories unlock recruits once and tutorial victories never earn achievements',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const slug of ['tutorial', 'original']) {
      const pack = CAMPAIGNS.find((candidate) => candidate.slug === slug)!
      const level =
        slug === 'tutorial'
          ? pack.levels[0]
          : pack.levels.find((candidate) => candidate.unlocks.includes('bomber'))!
      if (slug === 'original') {
        await page.evaluate(({ key, cleared }) => localStorage.setItem(key, String(cleared)), {
          key: CAMPAIGN_STORAGE_KEY,
          cleared: level.id - 1,
        })
      }
      const actions = victoryActions(level)
      let state = initialState(level.seed, level.setup, 'player')
      for (const action of actions.slice(0, -1)) state = transition(state, action).state
      assert.equal(state.winner, null)
      assert.equal(activePawn(state)!.side, 'player')
      const saved = {
        version: BATTLE_SNAPSHOT_VERSION,
        identity: battleIdentity('ai', level.seed, campaignBot(pack, level), level.setup),
        state: snapshotState(state),
      }
      await page.evaluate(
        (snapshot) => localStorage.setItem('hexmate.battle', JSON.stringify(snapshot)),
        saved,
      )
      await page.goto(origin + base + 'campaign/' + slug + '/' + level.id)
      // The tutorial pack teaches through the tour; other packs still open their briefing.
      await dismissTour(page)
      const briefing = page.getByRole('dialog', { name: 'Battle briefing', exact: true })
      if (await briefing.isVisible())
        await briefing.getByRole('button', { name: 'Go !', exact: true }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(await page.locator('[data-action]').count(), 3)
      assert.equal(
        await page.evaluate(() => localStorage.getItem('hexmate.achievements')),
        null,
      )
      await playInUi(page, state, actions.at(-1)!)
      await page.getByTestId('battle-result').waitFor()
      const toast = page.getByTestId('unit-unlock-toast')
      if (slug === 'original') {
        await toast.waitFor()
        assert.match(await toast.innerText(), new RegExp(unitNames.bomber + ' unlocked!'))
        assert.match(await toast.innerText(), /Available in all modes/)
      } else assert.equal(await toast.count(), 0)
      if (slug === 'tutorial') {
        assert.equal(
          await page.evaluate(() => localStorage.getItem('hexmate.achievements')),
          null,
        )
        assert.equal(
          await page.getByRole('status', { name: 'Achievement unlocked' }).count(),
          0,
        )
      } else {
        await page.waitForFunction(
          () => JSON.parse(localStorage.getItem('hexmate.achievements') ?? '[]').length > 0,
        )
      }
      for (const viewport of slug === 'tutorial'
        ? []
        : [
            { width: 280, height: 480 },
            { width: 390, height: 844 },
            { width: 844, height: 390 },
          ]) {
        await page.setViewportSize(viewport)
        assert.ok(
          await toast.evaluate((element) => {
            const rect = element.getBoundingClientRect()
            return (
              rect.left >= 0 &&
              rect.right <= innerWidth &&
              rect.top >= 0 &&
              rect.bottom <= innerHeight &&
              document.documentElement.scrollHeight <= innerHeight
            )
          }),
        )
      }
      if (process.env.PR_MEDIA_DIR && slug === 'original') {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        )
        await page.screenshot({ path: join(process.env.PR_MEDIA_DIR, slug + '-unlock.png') })
      }
      await page.reload()
      await dismissTour(page)
      if (await briefing.isVisible())
        await briefing.getByRole('button', { name: 'Go !', exact: true }).click()
      await page.getByTestId('battle-result').waitFor()
      assert.equal(await toast.count(), 0)
      if (slug === 'tutorial')
        assert.equal(
          await page.evaluate(() => localStorage.getItem('hexmate.achievements')),
          null,
        )
    }
    assert.deepEqual(errors, [])
  },
)

test('Campaign victory persists once across playback, parent updates and finished restores', async (t) => {
  const { page, origin } = await fixture(t)
  await page.addInitScript((progressKey) => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === progressKey) {
        const writes = Number(sessionStorage.getItem('test:campaign-writes') ?? '0')
        setItem.call(sessionStorage, 'test:campaign-writes', String(writes + 1))
      }
      setItem.call(this, key, value)
    }
  }, CAMPAIGN_STORAGE_KEY)
  const pack = CAMPAIGNS[1]
  const level = pack.levels[0]
  const actions = victoryActions(level)
  let state = initialState(level.seed, level.setup, 'player')
  for (const action of actions.slice(0, -1)) state = transition(state, action).state
  assert.equal(state.winner, null)
  await page.evaluate(
    (saved) => localStorage.setItem('hexmate.battle', JSON.stringify(saved)),
    {
      version: BATTLE_SNAPSHOT_VERSION,
      identity: battleIdentity('ai', level.seed, campaignBot(pack, level), level.setup),
      state: snapshotState(state),
    },
  )
  await page.goto(origin + base + 'campaign/original/1')
  await page.getByRole('button', { name: 'Go !', exact: true }).click()
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  await playInUi(page, state, actions.at(-1)!)
  await page.getByTestId('battle-result').waitFor()
  const writes = () =>
    page.evaluate(() => Number(sessionStorage.getItem('test:campaign-writes')))
  assert.equal(await writes(), 1)
  for (let restore = 0; restore < 2; restore++) {
    await page.reload()
    await page.getByTestId('battle-result').waitFor()
    assert.equal(await writes(), 1, 'Restoring a finished battle must not notify victory')
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
    assert.equal(await writes(), 1, 'Closing the briefing must not notify victory again')
  }
})

test(
  'Campaign handles corrupt or unavailable local storage without losing the current session',
  { timeout: 90_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const value of ['garbage', '-1', '21', '1.5', '{}']) {
      await page.evaluate(
        ({ key, value: storedValue }) => localStorage.setItem(key, storedValue),
        {
          key: CAMPAIGN_STORAGE_KEY,
          value,
        },
      )
      await page.goto(origin + base + 'campaign/original')
      await page.locator('ol[aria-label="Campaign levels"]').waitFor()
      assert.equal(await page.locator('ol[aria-label="Campaign levels"] a').count(), 1)
    }
    for (const method of ['getItem', 'setItem'] as const) {
      const level = method === 'getItem' ? 2 : 1
      await page.evaluate(
        ({ key, completed }) => localStorage.setItem(key, String(completed)),
        { key: CAMPAIGN_STORAGE_KEY, completed: level - 1 },
      )
      await page.goto(origin + base + 'campaign/original')
      await page.locator('ol[aria-label="Campaign levels"]').waitFor()
      await page.evaluate((storageMethod) => {
        Storage.prototype[storageMethod] = () => {
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
      if (CAMPAIGNS[1].levels[level].newElements.length)
        await page.getByRole('button', { name: 'Go !', exact: true }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.equal(
        await page.locator('[data-testid="battle-subtitle"]').textContent(),
        level + 1 + ' / 20',
      )
      await page.goto(origin + base + 'campaign')
    }
    assert.deepEqual(errors, [])
  },
)
