import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  initialState,
  activePawn,
  movementDestinations,
  specialTargets,
  type Axial,
  King,
  Lancer,
  Ninja,
  Swordsman,
  Archer,
  Magician,
  Bomber,
} from '../../src/lib/engine/index.ts'
import { Wolf } from '../../src/lib/engine/pawns/wolf.ts'
import { field } from '../field.ts'
import {
  battleIdentity,
  BATTLE_SNAPSHOT_VERSION,
  snapshotState,
} from '../../src/lib/battleSnapshot.ts'
import { DEFAULT_BOT_CONFIG } from '../../src/bots/catalog.ts'
import { base, fixture, playTurn } from './fixture.ts'

test('Rush targets enemies directly and area support lights the caster hexes', async (t) => {
  const { page, origin } = await fixture(t)
  for (const Unit of [Lancer, King, Wolf]) {
    const target = Unit === Lancer ? { q: 3, r: 0 } : { q: 1, r: 0 }
    const state = field([
      new Unit(1, 0, 0, 'player'),
      new King(2, 0, 1, 'player', 4),
      new King(3, target.q, target.r, 'enemy'),
      new Swordsman(4, -1, 0, 'player', 2),
    ])
    state.seed = `ability-ui-${state.pawns[0].kind}`
    await page.evaluate(
      (saved) => localStorage.setItem('hexmate.battle', JSON.stringify(saved)),
      {
        version: BATTLE_SNAPSHOT_VERSION,
        identity: battleIdentity('local', state.seed, DEFAULT_BOT_CONFIG, undefined),
        state: snapshotState(state),
      },
    )
    await page.goto(origin + base + 'game/' + state.seed + '?mode=local')
    await page.locator('[data-action="special"]:not([disabled])').click()
    await page
      .getByTestId('battlefield')
      .getByRole('button', { name: /King #3/ })
      .click()
    await page.getByTestId('combat-impacts').waitFor()
    if (Unit !== Lancer) {
      assert.equal(await page.getByTestId('support-halo').count(), 7)
      assert.equal(await page.getByTestId('combat-support-symbol').count(), 2)
    }
    await page.getByTestId('combat-impacts').waitFor({ state: 'hidden' })
    assert.equal(await page.getByTestId('support-halo').count(), 0)
  }
})

test('Ambush lands without a target or strikes beside the landing', async (t) => {
  const { page, origin } = await fixture(t)
  for (const [seed, landing, strike] of [
    ['ninja-land-ui', { q: -2, r: 0 }, false],
    ['ninja-strike-ui', { q: 3, r: 0 }, true],
  ] as const) {
    const state = field([
      new Ninja(1, 0, 0, 'player'),
      new King(2, 0, 1, 'player', 4),
      new King(3, 4, 0, 'enemy', 4),
    ])
    state.seed = seed
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
    const tileAt = (at: Axial) =>
      page
        .locator('[data-testid="hex-tile"]')
        .nth([...state.tiles.values()].findIndex((tile) => tile.q === at.q && tile.r === at.r))
    const special = page.locator('[data-action="special"]')
    await special.click()
    await tileAt(landing).click()
    // The landing is chosen: the signature confirms it, or an adjacent enemy takes the strike.
    if (strike) {
      assert.match(await special.innerText(), /Land here/)
      assert.match(await special.innerText(), /or choose an enemy/)
      await tileAt(landing).click()
      assert.match(await special.innerText(), /Cancel/)
      await tileAt(landing).click()
      await tileAt({ q: 4, r: 0 }).click()
      assert.match((await tileAt({ q: 4, r: 0 }).getAttribute('aria-label'))!, /1 health/)
    }
    assert.match((await tileAt(landing).getAttribute('aria-label'))!, /Ninja #1/)
    assert.match(await page.locator('[data-action="endTurn"]').innerText(), /1 energy left/)
    assert.equal(await special.getAttribute('aria-disabled'), 'true')
  }
})

test('Stationary damaging specials highlight enemy and empty area targets orange', async (t) => {
  const { page, origin } = await fixture(t)
  for (const Unit of [Archer, Magician, Bomber]) {
    const state = field([
      new Unit(1, 0, 0, 'player'),
      new King(2, -3, -2, 'player'),
      new King(3, Unit === Archer ? 2 : 1, 0, 'enemy', 4),
    ])
    state.seed = Unit.name + '-orange'
    // Empty lava centers/directions must retain the offensive target color too.
    state.tiles.get('2,0')!.terrain = 'lava'
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
    await page.locator('[data-action="special"]').click()
    for (const position of Unit === Archer ? ['2,0'] : ['1,0', '2,0']) {
      const index = [...state.tiles.keys()].indexOf(position)
      assert.equal(
        await page
          .getByTestId('hex-tile')
          .nth(index)
          .getByTestId('tile-face')
          .getAttribute('fill'),
        '#b98370',
      )
    }
  }
})

test('Ambush and Charge show direct strikes beside violet landing choices', async (t) => {
  const { page, origin } = await fixture(t)
  for (const Unit of [Ninja, Swordsman]) {
    for (const moveFirst of [false, true]) {
      const state = field([
        new Unit(1, 0, 0, 'player'),
        new King(2, -3, -2, 'player', 4),
        new King(3, 1, 0, 'enemy', 4),
      ])
      state.seed = Unit.name + '-direct-' + moveFirst
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
      const tileAt = (q: number, r: number) =>
        page
          .getByTestId('hex-tile')
          .nth([...state.tiles.values()].findIndex((tile) => tile.q === q && tile.r === r))
      await page.locator('[data-action="special"]').click()
      const enemy = tileAt(1, 0)
      const landing = tileAt(1, -1)
      assert.equal(await enemy.getByTestId('tile-face').getAttribute('fill'), '#b98370')
      assert.equal(await landing.getByTestId('tile-face').getAttribute('fill'), '#b79dce')
      if (moveFirst) await landing.click()
      await enemy.click()
      assert.match(
        (await tileAt(moveFirst ? 1 : 0, moveFirst ? -1 : 0).getAttribute('aria-label'))!,
        new RegExp(Unit.name + ' #1'),
      )
      assert.match(
        (await enemy.getAttribute('aria-label'))!,
        new RegExp(4 - state.pawns[0].attack.damage + ' health'),
      )
      assert.match(await page.locator('[data-action="endTurn"]').innerText(), /1 energy left/)
    }
  }
})

test(
  'Bulwarks keep moving after protecting allies offline on a small portrait screen',
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
    const pips = page.locator(`[data-pawn="${pawn.id}"]`)
    assert.equal(await pips.locator('[data-kind="hp"]').count(), 10)
    assert.equal(await pips.locator('[data-kind="hp"][data-filled="true"]').count(), 10)
    // Energy shows on the active pawn and hides on idle unbuffed pawns.
    assert.equal(await pips.locator('[data-kind="energy"]').count(), 3)
    assert.equal(await page.locator(`[data-pawn="${ally.id}"] [data-kind="energy"]`).count(), 0)
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
    assert.match(await page.locator('[data-action="endTurn"]').innerText(), /3 energy left/)
    await page.locator('[data-action="special"]').click()
    await page.locator('[data-testid="hex-tile"]').nth(tileIndex).click()
    assert.match(await page.locator('[data-action="endTurn"]').innerText(), /2 energy left/)
    assert.match(
      (await page
        .locator('[data-testid="hex-tile"]')
        .nth(tileIndex)
        .getAttribute('aria-label'))!,
      /protected by Bulwark/,
    )
    assert.equal(await page.locator('[data-art="protection-badge"]').count(), 1)
    // The protect frame finishes playing before the bulwark can move again.
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    assert.ok((await moves.count()) > 0)
    await page.reload()
    await page.locator('[data-action="endTurn"]:not([disabled])').waitFor()
    // Reloading resumes the recorded battle instead of resetting it.
    assert.match(await page.locator('[data-action="endTurn"]').innerText(), /2 energy left/)
    assert.equal(await page.locator('[data-art="protection-badge"]').count(), 1)
    assert.match(
      (await page
        .locator('[data-testid="hex-tile"]')
        .nth(tileIndex)
        .getAttribute('aria-label'))!,
      /protected by Bulwark/,
    )
    assert.ok((await moves.count()) > 0)
    assert.equal(
      await page.locator('[data-action="special"]').getAttribute('aria-disabled'),
      'true',
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
    )
    await playTurn(page)
    assert.deepEqual(errors, [])
  },
)
