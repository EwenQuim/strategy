import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialState, reducer, activePawn } from '../../src/lib/engine/index.ts'
import { NAPOLEON_LEVELS } from '../../src/bots/strategies/napoleon.ts'
import {
  battleIdentity,
  BATTLE_SNAPSHOT_VERSION,
  snapshotState,
} from '../../src/lib/battleSnapshot.ts'
import { base, fixture, playTurn } from './fixture.ts'

test(
  'Three custom panels configure both controllers and run a spectator battle',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    await page.getByRole('link', { name: 'Custom play', exact: true }).click()
    const first = page
      .locator('details')
      .filter({ has: page.locator('#custom-player-0-controller') })
    assert.equal(await first.getAttribute('open'), null)
    assert.equal(await page.locator('#custom-player-1-controller').inputValue(), 'ai')
    assert.equal(await page.getByRole('region', { name: 'Game configuration' }).count(), 1)
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      assert.ok(
        await page.getByRole('button', { name: 'Start battle' }).evaluate((button) => {
          const box = button.getBoundingClientRect()
          return (
            box.top >= 0 &&
            box.bottom <= innerHeight &&
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight
          )
        }),
      )
    }
    await page.setViewportSize({ width: 320, height: 568 })
    await first.locator('summary').first().click()
    await page.locator('#custom-player-0-controller').selectOption('ai')
    await page.locator('#custom-player-0-strategy').selectOption('random')
    await page.locator('#custom-player-1-strategy').selectOption('random')
    await page.getByRole('button', { name: 'Start battle' }).click()
    await page.waitForURL('**/game/**')
    assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('sideBots')!), {
      player: { name: 'random', options: {} },
      enemy: { name: 'random', options: {} },
    })
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem('hexmate.battle') ?? 'null')
      return saved?.state.round >= 2 || saved?.state.winner
    })
    assert.equal(await page.locator('[data-action="endTurn"]:not([disabled])').count(), 0)
    const snapshot = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('hexmate.battle')!),
    )
    const before = snapshot.state.round
    await page.reload()
    await page.waitForFunction((round) => {
      const saved = JSON.parse(localStorage.getItem('hexmate.battle') ?? 'null')
      return saved?.state.round >= round || saved?.state.winner
    }, before)
    assert.equal(await page.locator('[data-action="endTurn"]:not([disabled])').count(), 0)
    await page.goto(origin + base)
    assert.equal(await page.getByRole('link', { name: '2 players', exact: true }).count(), 0)
  },
)

test(
  'Custom controllers allow two humans or a human on either side, and validate AI options',
  { timeout: 60_000 },
  async (t) => {
    const { page, origin } = await fixture(t)
    for (const pairing of [
      ['human', 'human'],
      ['human', 'ai'],
      ['ai', 'human'],
    ] as const) {
      await page.goto(origin + base + 'custom')
      await page.locator('summary').filter({ hasText: 'Player 1' }).click()
      await page.locator('#custom-player-0-controller').selectOption(pairing[0])
      await page.locator('#custom-player-1-controller').selectOption(pairing[1])
      for (const side of [0, 1] as const) {
        if (pairing[side] === 'ai')
          await page.locator('#custom-player-' + side + '-strategy').selectOption('random')
      }
      await page.getByRole('button', { name: 'Start battle' }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      const sides = JSON.parse(new URL(page.url()).searchParams.get('sideBots')!)
      assert.equal(sides.player === null, pairing[0] === 'human')
      assert.equal(sides.enemy === null, pairing[1] === 'human')
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('hexmate.battle')!),
      )
      const active = saved.state.pawns.find(
        (pawn: { id: number }) => pawn.id === saved.state.order[saved.state.active],
      )
      assert.equal(sides[active.side], null)
    }
    await page.goto(origin + base + 'custom')
    await page.getByText('AI options', { exact: true }).click()
    await page.getByLabel('Candidates', { exact: true }).fill('0')
    assert.ok(await page.getByRole('button', { name: 'Start battle' }).isDisabled())
    assert.ok(await page.getByRole('alert').isVisible())
    await page.getByLabel('Candidates', { exact: true }).fill('3')
    assert.ok(await page.getByRole('button', { name: 'Start battle' }).isEnabled())
    await page.getByRole('button', { name: 'Start battle' }).click()
    await page.waitForURL('**/game/**')
    assert.equal(
      JSON.parse(new URL(page.url()).searchParams.get('sideBots')!).enemy.options.candidates,
      3,
    )
  },
)

test(
  'Custom play mirrors rosters live, allows independent enemies, and launches configured battles offline',
  { timeout: 60_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.setOffline(true)
    await page.getByRole('link', { name: 'Custom play' }).click()
    const playerArcher = page.getByRole('spinbutton', { name: 'Player 1 Archer', exact: true })
    const enemyArcher = page.getByRole('spinbutton', { name: 'Player 2 Archer', exact: true })
    const mirror = page.getByRole('checkbox', { name: 'Mirror player roster' })
    assert.equal(await mirror.isChecked(), true)
    assert.equal(await enemyArcher.isDisabled(), true)
    // The default roster is random, so start from a bare king to make the counts below deterministic.
    for (const input of await page.getByRole('spinbutton', { name: /^Player 1 / }).all()) {
      await input.fill('0')
    }
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
    await page.locator('#custom-player-1-controller').selectOption('human')
    assert.equal(await page.locator('#custom-player-1-difficulty').count(), 0)
    await page.getByLabel('Biome', { exact: true }).selectOption('mountains')
    await page.getByRole('spinbutton', { name: 'Player 1 Swordsman', exact: true }).fill('19')
    await page.getByRole('spinbutton', { name: 'Player 2 Swordsman', exact: true }).fill('22')
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
        .locator('[data-testid="initiative-unit"][data-side="player"][title*="Archer"]')
        .count(),
      4,
    )
    assert.equal(
      await page
        .locator('[data-testid="initiative-unit"][data-side="enemy"][title*="Archer"]')
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
    await page.getByRole('heading', { name: 'How to play' }).waitFor()
    assert.doesNotMatch(await page.locator('dialog').innerText(), /unlock the next level/)
    await page.getByRole('button', { name: 'Close dialog' }).click()
    for (const difficulty of ['easy', 'normal', 'hard', 'brutal'] as const) {
      await page.goto(origin + base + 'custom')
      await page.locator('#custom-player-1-difficulty').selectOption(difficulty)
      await page.getByLabel('Biome', { exact: true }).selectOption('desert')
      await page.getByRole('button', { name: 'Start battle' }).click()
      await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
      assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('bot')!), {
        name: 'napoleon',
        options: NAPOLEON_LEVELS[difficulty],
      })
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
      await page.getByRole('heading', { name: 'How to play' }).waitFor()
      await page.getByRole('button', { name: 'Close dialog' }).click()
      await playTurn(page)
    }
    assert.deepEqual(errors, [])
  },
)

test(
  'A pending remote bot survives UI rerenders without duplicate requests',
  { timeout: 30_000 },
  async (t) => {
    const { context, page, origin } = await fixture(t)
    let state = initialState('bot-rerender')
    while (activePawn(state)?.side !== 'enemy') state = reducer(state, { type: 'endTurn' })
    const bot = { name: 'jev', options: { model: 'jev-latest' } }
    await page.evaluate(
      (saved) => {
        localStorage.setItem('hexmate.jevApiKey', 'test-api-key')
        localStorage.setItem('hexmate.tutorial-seen', 'true')
        localStorage.setItem('hexmate.battle', JSON.stringify(saved))
      },
      {
        version: BATTLE_SNAPSHOT_VERSION,
        identity: battleIdentity('ai', state.seed, bot, undefined),
        state: snapshotState(state),
      },
    )
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    t.after(() => release())
    let requests = 0
    const firstRequest = page.waitForRequest('https://api.typesafe.ai/v1/systemone')
    await context.route('https://api.typesafe.ai/v1/systemone', async (route) => {
      requests++
      if (requests === 1) await pending
      const criteria = route.request().postDataJSON().questions.move.criteria as Record<
        string,
        string
      >
      const choice = Object.entries(criteria).find(([, text]) =>
        text.startsWith('end the turn'),
      )?.[0]
      assert.ok(choice)
      await route.fulfill({ json: { answers: { move: { choice } } } })
    })
    await page.goto(
      origin + base + 'game/' + state.seed + '?bot=' + encodeURIComponent(JSON.stringify(bot)),
    )
    await firstRequest
    try {
      await page.getByRole('button', { name: 'How to play' }).click()
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
      await page.getByRole('button', { name: 'How to play' }).click()
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
      assert.equal(requests, 1, 'UI rerenders must keep the pending decision')
    } finally {
      release()
    }
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.ok(requests > 0)
  },
)
