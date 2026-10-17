import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { initialState, activePawn, King, Swordsman } from '../../src/lib/engine/index.ts'
import { field } from '../field.ts'
import { transition } from '../../src/lib/engine/engine.ts'
import { huntTheKing } from '../../src/bots/targetPicker.ts'
import { RulesBot } from '../../src/bots/strategies/rules.ts'
import { possessiveArmyLabels, playerNames } from '../../src/army-labels.ts'
import { unitNames } from '../../src/i18n/units.ts'
import {
  battleIdentity,
  BATTLE_SNAPSHOT_VERSION,
  snapshotState,
} from '../../src/lib/battleSnapshot.ts'
import { DEFAULT_BOT_CONFIG } from '../../src/bots/catalog.ts'
import {
  base,
  fixture,
  dismissQuickPlayTutorial,
  playInUi,
  playTurn,
  finishCampaignLevel,
  sharedBrowser,
} from './fixture.ts'

test('Enemy focus stays responsive during worker search and the command deck stays inactive', async (t) => {
  const { page, origin, files } = await fixture(t)
  const state = field([
    new King(1, 0, 0, 'player'),
    new Swordsman(2, 2, 0, 'enemy'),
    new King(3, 3, 0, 'enemy'),
  ])
  state.seed = 'enemy-focus-before-search'
  await page.evaluate(
    (saved) => localStorage.setItem('hexmate.battle', JSON.stringify(saved)),
    {
      version: BATTLE_SNAPSHOT_VERSION,
      identity: battleIdentity('ai', state.seed, DEFAULT_BOT_CONFIG, undefined),
      state: snapshotState(state),
    },
  )
  await page.goto(origin + base + 'game/' + state.seed)
  await dismissQuickPlayTutorial(page)
  if (process.env.PR_MEDIA_DIR)
    await page.screenshot({ path: join(process.env.PR_MEDIA_DIR, 'player-turn.png') })
  const workerPath = [...files.keys()].find((path) => /\/bot\.worker-.*\.js$/.test(path))!
  files.set(
    workerPath,
    Buffer.from(
      'const until = Date.now() + 3000; while (Date.now() < until) {}\n' +
        files.get(workerPath)!.toString(),
    ),
  )
  await page.evaluate(async (path) => {
    for (const name of await caches.keys()) await (await caches.open(name)).delete(path)
  }, workerPath)
  const workerRequest = page.waitForRequest('**/bot.worker-*.js')
  const workerStarted = page.waitForEvent('worker')
  await page
    .getByRole('button', { name: /End turn/ })
    .evaluate((button: HTMLButtonElement) => button.click())
  await workerRequest
  const worker = await workerStarted
  const workerClosed = worker.waitForEvent('close')
  const started = Date.now()
  await page.evaluate(() => new Promise((resolve) => window.setTimeout(resolve, 50)))
  assert.ok(Date.now() - started < 1000, 'Worker computation must not block the UI thread')
  assert.equal(
    await page
      .locator('[data-testid="initiative-unit"][aria-current="step"]')
      .getAttribute('data-side'),
    'enemy',
  )
  assert.equal(await page.getByTestId('preview-ability').textContent(), 'Charge2 energy')
  assert.equal(await page.locator('[data-action="endTurn"]').count(), 0)
  assert.equal(
    await page.getByRole('button', { name: 'Stop previewing', exact: true }).count(),
    0,
  )
  assert.equal(await page.getByTestId('unit-focus').getByRole('button').count(), 0)
  if (process.env.PR_MEDIA_DIR)
    await page.screenshot({ path: join(process.env.PR_MEDIA_DIR, 'enemy-thinking.png') })
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  await workerClosed
  const nextWorker = page.waitForEvent('worker')
  await page.getByRole('button', { name: /End turn/ }).click()
  const cancelledWorker = await nextWorker
  const cancelled = cancelledWorker.waitForEvent('close')
  await page.getByRole('link', { name: 'Hexmate home', exact: true }).click()
  await cancelled
  await page.getByTestId('battlefield').waitFor({ state: 'hidden' })
  assert.equal(await page.getByTestId('battlefield').count(), 0)
})

test('Saved battles resume and enemies fight without a service worker, even when web workers fail', async (t) => {
  const { origin } = await fixture(t)
  const browser = await sharedBrowser!
  for (const workers of ['available', 'missing', 'blocked', 'load-failure']) {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      viewport: { width: 320, height: 568 },
      reducedMotion: 'reduce',
    })
    try {
      if (workers === 'missing')
        await context.addInitScript(() => Reflect.deleteProperty(globalThis, 'Worker'))
      if (workers === 'blocked')
        await context.addInitScript(() => {
          globalThis.Worker = class {
            constructor() {
              throw new DOMException('Workers blocked', 'SecurityError')
            }
          } as unknown as typeof Worker
        })
      if (workers === 'load-failure')
        await context.route('**/bot.worker-*.js', (route) => route.abort())
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(origin + base)
      const state = field([
        new Swordsman(1, 0, 0, 'enemy'),
        new King(2, 1, 0, 'player'),
        new King(3, -1, 0, 'enemy'),
      ])
      state.seed = 'no-service-worker-' + workers
      state.pawns[1].hp = 7
      await page.evaluate(
        (saved) => {
          localStorage.setItem('hexmate.tutorial-seen', 'true')
          localStorage.setItem('hexmate.battle', JSON.stringify(saved))
        },
        {
          version: BATTLE_SNAPSHOT_VERSION,
          identity: battleIdentity('ai', state.seed, DEFAULT_BOT_CONFIG, undefined),
          state: snapshotState(state),
        },
      )
      await page.goto(origin + base + 'game/' + state.seed)
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('hexmate.battle')!),
      )
      assert.equal(saved.state.seed, state.seed)
      assert.ok(saved.state.pawns.find((pawn: { id: number }) => pawn.id === 2).hp < 7, workers)
      await page.reload()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.deepEqual(
        await page.evaluate(() => JSON.parse(localStorage.getItem('hexmate.battle')!)),
        saved,
      )
      assert.equal(await page.evaluate(() => navigator.serviceWorker.controller), null)
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

test('Reloading resumes an in-progress battle instead of resetting it', async (t) => {
  const { page, origin } = await fixture(t)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const board = () =>
    page
      .locator('[data-testid="hex-tile"]')
      .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute('aria-label')))
  await page.goto(origin + base + 'game/reload-resume?mode=local')
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  const opening = await board()
  await playTurn(page)
  const played = await board()
  assert.notDeepEqual(played, opening)
  await page.reload()
  await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
  assert.deepEqual(await board(), played)
  await playTurn(page)
  assert.deepEqual(errors, [])
})

test(
  'Quick play shows the rules tutorial to new players once',
  { timeout: 60_000 },
  async (t) => {
    const { page } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('link', { name: 'Quick play' }).click()
    const tutorial = page.getByRole('dialog', { name: 'Quick play', includeHidden: true })
    await tutorial.waitFor()
    const text = await tutorial.innerText()
    assert.match(text, /Kill the enemy king/)
    await tutorial.getByRole('button', { name: 'Next', exact: true }).click()
    assert.match(await tutorial.innerText(), /Units act one at a time/)
    await tutorial.getByRole('button', { name: 'Next', exact: true }).click()
    assert.match(
      await tutorial.innerText(),
      /Move and use your signature ability once per activation/,
    )
    await tutorial.getByRole('button', { name: 'Next', exact: true }).click()
    assert.match(await tutorial.innerText(), /Lose your king, lose the battle/)
    await page.getByRole('button', { name: 'Go !', exact: true }).click()
    await tutorial.waitFor({ state: 'hidden' })
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    await page.getByRole('link', { name: 'Hexmate home' }).click()
    await page.getByRole('link', { name: 'Quick play' }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(await tutorial.count(), 0)
    assert.deepEqual(errors, [])
  },
)

test(
  'Local mode plays both armies offline on mobile, names the winner, and preserves mode for new games',
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
    await page.getByRole('heading', { name: 'How to play' }).waitFor()
    assert.doesNotMatch(await page.locator('dialog').innerText(), /shuffles the order/)
    assert.doesNotMatch(
      await page.locator('dialog').innerText(),
      /Enemy units act automatically/,
    )
    await page.getByRole('button', { name: 'Close dialog' }).click()

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const actionsBySide = new Set<string>()
    let deaths = 0
    const seed = 'local-24'
    let state = initialState(seed)
    await page.goto(origin + base + 'game/' + seed + '?mode=local')
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    const first = activePawn(state)!
    assert.equal(
      await page.locator('[data-testid="player-turn"]').textContent(),
      playerNames[first.side] + ' turn',
    )
    assert.match(await page.locator('[data-action="endTurn"]').innerText(), /3 energy left/)
    const opening = await page.locator('ol[aria-label="Round turn order"]').innerHTML()
    await page.reload()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(await page.locator('ol[aria-label="Round turn order"]').innerHTML(), opening)

    for (let step = 0; step < 100 && !state.winner; step++) {
      for (const action of await new RulesBot(huntTheKing).chooseActions(state)) {
        const pawn = activePawn(state)!
        assert.equal(
          await page
            .locator('[data-testid="initiative-unit"][aria-current="step"]')
            .getAttribute('title'),
          possessiveArmyLabels('local')[pawn.side] +
            ' ' +
            unitNames[pawn.kind] +
            ' #' +
            pawn.id,
        )
        assert.equal(
          await page.locator('[data-testid="player-turn"]').textContent(),
          playerNames[pawn.side] + ' turn',
        )
        actionsBySide.add(pawn.side + '-' + action.type)
        const result = transition(state, action)
        await playInUi(page, state, action)
        const fallen = result.frames[0]?.state.pawns.filter((unit) => unit.hp <= 0) ?? []
        if (fallen.length) {
          const chips = page.locator('[data-fallen="true"]')
          await chips.first().waitFor()
          assert.equal(await chips.count(), fallen.length)
          const feedback = page.getByTestId('combat-feedback')
          const [killVariant, flashName, sweepName] = await feedback.evaluate((element) => [
            element.className.includes('combat-feedback--kill'),
            getComputedStyle(element, '::before').animationName,
            getComputedStyle(element, '::after').animationName,
          ])
          assert.ok(killVariant)
          assert.equal(flashName, 'kill-flash')
          assert.equal(sweepName, 'feedback-sweep')
          const messages = page.getByTestId('killed-message')
          assert.deepEqual(
            await messages.allTextContents(),
            fallen.map(() => 'Killed'),
          )
          assert.ok(
            await messages.evaluateAll((elements) =>
              elements.every(
                (element) => getComputedStyle(element).animationName === 'label-drift',
              ),
            ),
          )
          assert.ok(
            await chips.evaluateAll((elements) =>
              elements.every(
                (element) => getComputedStyle(element).animationName === 'pawn-fall',
              ),
            ),
          )
          assert.equal(await page.getByTestId('battle-result').count(), 0)
          deaths += fallen.length
        }
        state = result.state
        if (state.winner) await page.locator('[data-testid="battle-result"]').waitFor()
        else await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      }
    }
    assert.ok(state.winner, 'The local battle must reach a winner')
    assert.ok(deaths > 0)
    assert.equal(
      await page.getByTestId('battle-result').getAttribute('data-outcome'),
      'victory',
    )
    assert.equal(
      await page
        .getByTestId('result-card')
        .evaluate((element) => getComputedStyle(element).animationName),
      'battle-result-victory',
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(
      await page
        .getByTestId('result-card')
        .evaluate((element) => getComputedStyle(element).animationName),
      'none',
    )
    assert.equal(await page.getByTestId('battle-result-effect').isVisible(), false)
    assert.equal(
      await page.locator('[data-testid="result-card"] h1').textContent(),
      state.winner === 'draw' ? 'Draw' : playerNames[state.winner] + ' wins!',
    )
    assert.equal(await page.locator('[data-action="endTurn"]').isDisabled(), true)
    await page.getByRole('link', { name: 'New game' }).click()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'local')
    assert.notEqual(new URL(page.url()).pathname, base + 'game/' + seed)
    await playTurn(page)
    for (const side of ['player', 'enemy']) {
      assert.ok(actionsBySide.has(side + '-move'))
      assert.ok(actionsBySide.has(side + '-special'))
    }
    await page.getByRole('link', { name: 'Hexmate home' }).click()
    await page.getByRole('link', { name: 'Quick play' }).click()
    await dismissQuickPlayTutorial(page)
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'ai')
    assert.equal(await page.locator('[data-testid="player-turn"]').count(), 0)
    await playTurn(page)
    await page.goto(origin + base + 'game/local-26?mode=invalid')
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.equal(await page.locator('[data-testid="player-turn"]').count(), 0)
    assert.match(
      (await page
        .locator('[data-testid="initiative-unit"][aria-current="step"]')
        .getAttribute('title'))!,
      /^Your /,
    )
    assert.deepEqual(errors, [])
  },
)

test(
  'Battle results distinguish AI victory and defeat without blocking compact controls',
  { timeout: 120_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    for (const surrender of [false, true]) {
      const level = surrender ? 2 : 1
      await page.goto(origin + base + 'campaign/original/' + level)
      assert.equal(
        await finishCampaignLevel(page, level, surrender),
        surrender ? 'enemy' : 'player',
      )
      const outcome = surrender ? 'defeat' : 'victory'
      const result = page.getByTestId('battle-result')
      const card = page.getByTestId('result-card')
      assert.equal(await result.getAttribute('data-outcome'), outcome)
      assert.equal(
        await card.evaluate((element) => getComputedStyle(element).animationName),
        'battle-result-' + outcome,
      )
      assert.equal(
        await page
          .getByTestId('battle-result-effect')
          .evaluate((element) => getComputedStyle(element).pointerEvents),
        'none',
      )
      await card.evaluate(async (element) => {
        await Promise.all(element.getAnimations().map((animation) => animation.finished))
      })
      for (const viewport of [
        { width: 320, height: 568 },
        { width: 390, height: 844 },
        { width: 600, height: 480 },
      ]) {
        await page.setViewportSize(viewport)
        assert.ok(
          await card.evaluate((element) => {
            const rect = element.getBoundingClientRect()
            return (
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= innerWidth &&
              rect.bottom <= innerHeight &&
              document.documentElement.scrollHeight <= innerHeight
            )
          }),
        )
      }
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(
        await card.evaluate((element) => getComputedStyle(element).animationName),
        'none',
      )
      assert.equal(await page.getByTestId('battle-result-effect').isVisible(), false)
      if (surrender) {
        await page.getByRole('button', { name: 'Retry level' }).click()
        await result.waitFor({ state: 'detached' })
        await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      }
      await page.emulateMedia({ reducedMotion: 'no-preference' })
    }
    assert.deepEqual(errors, [])
  },
)

test('Keyboard shortcuts aim, cancel, open help and end turns', async (t) => {
  const { page, origin } = await fixture(t)
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player', 4),
    new King(3, 1, 0, 'enemy', 4),
  ])
  state.seed = 'keyboard-shortcuts'
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
  const special = page.locator('[data-action="special"]')
  // A toggles ability aiming, Escape cancels it.
  await page.keyboard.press('a')
  assert.match(await special.innerText(), /Cancel/)
  await page.keyboard.press('Escape')
  assert.doesNotMatch(await special.innerText(), /Cancel/)
  // H and ? open the help dialog, which lists the shortcuts; Escape closes it.
  const dialog = page.getByRole('dialog')
  for (const key of ['h', '?']) {
    await page.keyboard.press(key)
    await dialog.waitFor()
    await page.getByRole('heading', { name: 'Keyboard shortcuts' }).waitFor()
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
  }
  // E ends the turn.
  await page.keyboard.press('e')
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem('hexmate.battle') ?? 'null')
    return saved && saved.state.active !== 0
  })
})
