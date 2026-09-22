import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CAMPAIGN_LEVELS,
  parseCampaignProgress,
  isLevelUnlocked,
  completeCampaignLevel,
} from '../src/lib/campaign.ts'
import {
  initialState as coreState,
  MAP_HEIGHT,
  distFrom,
  key,
  type TileFeature,
} from '../src/lib/engine/index.ts'
import { initialState, transition } from '../src/lib/bot.ts'
import { campaignActions } from './campaign-actions.ts'
import levels from '../src/lib/campaign-levels.json' with { type: 'json' }

test('Every campaign level comes directly from one JSON with both complete armies', () => {
  assert.equal(CAMPAIGN_LEVELS, levels)
  for (const level of levels) {
    assert.deepEqual(Object.keys(level).sort(), ['id', 'intro', 'name', 'seed', 'setup'])
    assert.equal(typeof level.intro.roleplay, 'string')
    assert.ok(level.intro.roleplay.length > 0)
    for (const element of level.intro.newElements) {
      assert.deepEqual(Object.keys(element).sort(), ['description', 'name'])
      assert.ok(element.name.length > 0 && element.description.length > 0)
    }
    assert.deepEqual(Object.keys(level.setup).sort(), ['biome', 'enemy', 'map', 'player'])
    const state = coreState(level.seed, CAMPAIGN_LEVELS[level.id - 1].setup)
    for (const side of ['player', 'enemy'] as const)
      assert.deepEqual(
        state.pawns
          .filter((pawn) => pawn.side === side)
          .map((pawn) => ({
            kind: pawn.kind,
            col: pawn.q + Math.floor(pawn.r / 2),
            row: pawn.r,
          })),
        level.setup[side],
      )
  }
})

test('Campaign Bulwarks start on their assigned rows for both sides', () => {
  for (const [side, row] of [
    ['player', MAP_HEIGHT - 3],
    ['enemy', 3],
  ] as const) {
    const bulwarks = CAMPAIGN_LEVELS.flatMap((level) =>
      level.setup[side].filter((pawn) => pawn.kind === 'bulwark'),
    )
    assert.ok(bulwarks.length > 0)
    for (const pawn of bulwarks) assert.equal(pawn.row, row)
  }
})

test('The campaign has twenty distinct deterministic AI levels that can finish', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 20)
  assert.equal(new Set(CAMPAIGN_LEVELS.map((level) => level.seed)).size, 20)
  assert.equal(new Set(CAMPAIGN_LEVELS.map((level) => level.name)).size, 20)
  assert.deepEqual(
    CAMPAIGN_LEVELS.map((level) => level.id),
    Array.from({ length: 20 }, (_, index) => index + 1),
  )
  const biomes = new Set<string>()
  for (const level of CAMPAIGN_LEVELS) {
    const core = coreState(level.seed, level.setup)
    assert.deepEqual(core, coreState(level.seed, level.setup))
    assert.equal(core.pawns.length, level.setup.player.length + level.setup.enemy.length)
    biomes.add(core.biome)
    let state = initialState(level.seed, level.setup)
    for (let step = 0; step < 300 && !state.winner; step++) {
      for (const action of campaignActions(state)) {
        const result = transition(state, action)
        assert.notEqual(result.state, state)
        state = result.state
      }
    }
    assert.ok(state.winner, 'Level ' + level.id + ' must finish')
    if (level.id === 1 || level.id === 20) assert.equal(state.winner, 'player')
    assert.deepEqual(
      transition(state, { type: 'restart' }).state,
      initialState(level.seed, level.setup),
    )
  }
  assert.deepEqual(biomes, new Set(['verdant', 'mountains', 'desert', 'volcano']))
})

test('Three volcanic encounters and one of each special tile have safe, contested approaches', () => {
  const volcanic = CAMPAIGN_LEVELS.filter((level) => level.setup.biome === 'volcano')
  assert.deepEqual(
    volcanic.map((level) => level.id),
    [9, 15, 18],
  )
  const features: Record<TileFeature, number[]> = { watchtower: [], spring: [], rune: [] }
  for (const level of CAMPAIGN_LEVELS) {
    const state = coreState(level.seed, level.setup)
    const safe = new Map([...state.tiles].filter(([, tile]) => tile.terrain !== 'lava'))
    const specials = [...state.tiles.values()].filter((tile) => tile.feature)
    assert.ok(specials.length <= 2)
    for (const tile of specials) {
      features[tile.feature!].push(level.id)
      assert.ok(tile.r === 5 || tile.r === 6)
      assert.ok(!state.pawns.some((pawn) => pawn.q === tile.q && pawn.r === tile.r))
      for (const side of ['player', 'enemy'] as const) {
        const king = state.pawns.find((pawn) => pawn.kind === 'king' && pawn.side === side)!
        assert.ok(distFrom(safe, [king]).has(key(tile.q, tile.r)))
      }
    }
    if (state.biome !== 'volcano') continue
    assert.ok([...state.tiles.values()].some((tile) => tile.terrain === 'lava'))
    assert.ok(
      [...state.tiles.values()].every(
        (tile) => tile.terrain === 'basalt' || tile.terrain === 'lava' || tile.feature,
      ),
    )
    assert.ok(
      state.pawns.every((pawn) => state.tiles.get(key(pawn.q, pawn.r))!.terrain === 'basalt'),
    )
    assert.equal(
      distFrom(safe, [state.pawns[0]]).size,
      safe.size,
      'Safe routes across level ' + level.id,
    )
  }
  assert.deepEqual(features, { watchtower: [5], spring: [14], rune: [15] })
})

test('Campaign progress unlocks exactly the next level, never regresses, and stops at twenty', () => {
  let completed = 0
  for (let level = 1; level <= 20; level++) {
    for (let candidate = 1; candidate <= 20; candidate++)
      assert.equal(isLevelUnlocked(candidate, completed), candidate <= level)
    assert.equal(completeCampaignLevel(completed, level + 1), completed)
    completed = completeCampaignLevel(completed, level)
    assert.equal(completed, level)
    assert.equal(completeCampaignLevel(completed, 1), level)
    assert.equal(completeCampaignLevel(completed, level), level)
    assert.equal(parseCampaignProgress(String(completed)), completed)
  }
  for (const level of [-1, 0, 1.5, 21, NaN, Infinity]) {
    assert.equal(isLevelUnlocked(level, completed), false)
    assert.equal(completeCampaignLevel(completed, level), completed)
  }
})

test('Missing or corrupt local progress starts at level one instead of unlocking levels', () => {
  for (const value of [
    null,
    '',
    'garbage',
    '{}',
    '[]',
    'true',
    '-1',
    '1.5',
    '21',
    'Infinity',
    'NaN',
    '1e1',
  ])
    assert.equal(parseCampaignProgress(value), 0)
  assert.equal(parseCampaignProgress('0'), 0)
  assert.equal(parseCampaignProgress('19'), 19)
  assert.equal(parseCampaignProgress('20'), 20)
})
