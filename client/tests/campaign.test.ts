import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CAMPAIGNS,
  parseCampaignProgress,
  isLevelUnlocked,
  completeCampaignLevel,
  withBriefings,
} from '../src/lib/campaign.ts'
import {
  initialState as coreState,
  PAWN_CLASSES,
  passable,
  specialTargets,
  hexDist,
  hexOf,
  reducer,
  distFrom,
  key,
  type TileFeature,
} from '../src/lib/engine/index.ts'
import originalLevels from '../src/lib/campaigns/001-original.json' with { type: 'json' }
import brutalLevels from '../src/lib/campaigns/002-brutal.json' with { type: 'json' }

const original = CAMPAIGNS[0]
const brutal = CAMPAIGNS[1]

test('Every campaign level comes directly from one JSON with both complete armies', () => {
  assert.equal(original.levels.length, originalLevels.length)
  original.levels.forEach((level, index) =>
    assert.deepEqual(level, { ...originalLevels[index], newElements: level.newElements }),
  )
  for (const level of [...originalLevels, ...brutalLevels])
    assert.deepEqual(Object.keys(level).sort(), ['difficulty', 'id', 'name', 'seed', 'setup'])
  for (const level of [...original.levels, ...brutal.levels]) {
    assert.deepEqual(Object.keys(level.setup).sort(), [
      'biome',
      'enemy',
      ...(level.id === 17 ? ['hellfireCount'] : []),
      'map',
      'player',
    ])
    const state = coreState(level.seed, level.setup)
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

test('The brutal pack replays the original encounters against the hard AI', () => {
  assert.deepEqual(
    brutal.levels.map((level) => ({ name: level.name, seed: level.seed, setup: level.setup })),
    original.levels.map((level) => ({
      name: level.name,
      seed: level.seed,
      setup: level.setup,
    })),
  )
  assert.deepEqual(
    original.levels.map((level) => level.difficulty),
    Array<string>(original.levels.length).fill('normal'),
  )
  assert.deepEqual(
    brutal.levels.map((level) => level.difficulty),
    Array<string>(brutal.levels.length).fill('hard'),
  )
})

test('Campaign outlines are distinct, compact and smaller in the introductory battles', () => {
  const outlines = new Set<string>()
  for (const level of original.levels) {
    const { map } = level.setup
    outlines.add(map.map((row) => row.replace(/[^_]/g, '.')).join('/'))
    assert.ok(
      map.some((row) => row.includes('_')),
      'Shaped outline in level ' + level.id,
    )
    assert.ok(map.length <= 12 && map.every((row) => row.length <= 8))
    const state = coreState(level.seed, level.setup)
    assert.ok(state.tiles.size < 96)
    if (level.id <= 2) assert.ok(state.tiles.size <= 36)
    assert.ok(state.pawns.every((pawn) => passable(state.tiles.get(key(pawn.q, pawn.r)))))
  }
  assert.equal(outlines.size, original.levels.length)
})

test('The last four encounters use Hell, introducing one warning before two', () => {
  const hell = original.levels.filter((level) => level.setup.biome === 'hell')
  assert.deepEqual(
    hell.map((level) => level.id),
    [17, 18, 19, 20],
  )
  assert.deepEqual(
    hell.map((level) => coreState(level.seed, level.setup).hellfire.length),
    [1, 2, 2, 2],
  )
})

test('The campaign crosses the Vale, Mountains, Desert, Volcano then Hell, four levels each', () => {
  assert.deepEqual(
    original.levels.map((level) => level.setup.biome),
    (['verdant', 'mountains', 'desert', 'volcano', 'hell'] as const).flatMap((biome) =>
      Array<string>(4).fill(biome),
    ),
  )
})

test('Authored guardians cover their partners, including the wizard-flank deployment', () => {
  for (const [id, side, kind] of [
    [7, 'player', 'king'],
    [16, 'player', 'magician'],
    [19, 'enemy', 'king'],
  ] as const) {
    const level = original.levels[id - 1]
    const state = coreState(level.seed, level.setup)
    const ally = state.pawns.find((pawn) => pawn.side === side && pawn.kind === kind)!
    const guards = state.pawns.filter((pawn) => pawn.side === side && pawn.kind === 'bulwark')
    assert.ok(guards.length > 0)
    for (const guard of guards) assert.ok(specialTargets(state.pawns, guard).includes(ally))
    if (id === 16) assert.equal(hexDist(guards[0], ally), 2)
  }
})

test('All encounters have safe routes and later levels combine previously introduced features', () => {
  const features: Record<TileFeature, number[]> = { watchtower: [], spring: [], rune: [] }
  for (const level of original.levels) {
    const state = coreState(level.seed, level.setup)
    const safe = new Map(
      [...state.tiles].filter(([, tile]) => passable(tile) && tile.terrain !== 'lava'),
    )
    assert.equal(
      distFrom(safe, [state.pawns[0]]).size,
      safe.size,
      'Connected safe terrain in level ' + level.id,
    )
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
  assert.deepEqual(features, {
    watchtower: [5, 17, 18],
    spring: [14, 17, 19, 20],
    rune: [15, 18, 20],
  })
})

test('The campaign introduces units gradually and keeps the opening free of obstacles', () => {
  const firstAppearance: Record<string, number> = {}
  for (const level of original.levels) {
    for (const pawn of [...level.setup.player, ...level.setup.enemy]) {
      if (firstAppearance[pawn.kind]) continue
      firstAppearance[pawn.kind] = level.id
    }
  }
  assert.deepEqual(firstAppearance, {
    king: 1,
    swordsman: 1,
    archer: 2,
    magician: 4,
    bulwark: 7,
    bomber: 8,
    ninja: 10,
  })
  assert.equal(original.levels[0].setup.player.length, 2)
  assert.equal(original.levels[0].setup.enemy.length, 1)
  for (const level of original.levels.slice(0, 2)) {
    assert.ok(level.setup.map.every((row) => /^[.f_]+$/.test(row)))
    assert.ok(level.newElements.length <= 2)
  }
  assert.equal(new Set(original.levels.map((level) => level.setup.map.join(''))).size, 20)
  assert.ok(original.levels[9].setup.map.every((row) => /^[s_]+$/.test(row)))
  for (const side of ['player', 'enemy'] as const)
    assert.deepEqual(
      new Set(original.levels[19].setup[side].map((pawn) => pawn.kind)),
      new Set(Object.keys(PAWN_CLASSES)),
    )
})

test('Briefings introduce each unit, terrain, feature and Hellfire on its first level', () => {
  assert.deepEqual(
    Object.fromEntries(
      original.levels
        .filter((level) => level.newElements.length)
        .map((level) => [level.id, level.newElements.map((element) => element.name)]),
    ),
    {
      1: ['Swordsman', 'King'],
      2: ['Archer', 'Escape'],
      3: ['Lakes'],
      4: ['Magician'],
      5: ['Watchtower'],
      6: ['Mountains'],
      7: ['Bulwark'],
      8: ['Bomber'],
      9: ['Desert'],
      10: ['Ninja'],
      13: ['Lava'],
      14: ['Healing spring'],
      15: ['Power rune'],
      17: ['Hellfire'],
    },
  )
})

test('Later campaigns only introduce elements that earlier campaigns never showed', () => {
  assert.ok(brutal.levels.every((level) => level.newElements.length === 0))
  const [, [volcanoOnly]] = withBriefings([original.levels.slice(0, 12), [original.levels[12]]])
  assert.deepEqual(
    volcanoOnly.newElements.map((element) => element.name),
    ['Lava'],
  )
})

test('Powder Lesson and Iron Caravan offer useful blasts without requiring friendly fire', () => {
  for (const [id, minimumHits] of [
    [8, 2],
    [12, 3],
  ] as const) {
    const level = original.levels[id - 1]
    const state = coreState(level.seed, level.setup)
    const bombers = state.pawns.filter(
      (pawn) => pawn.side === 'player' && pawn.kind === 'bomber',
    )
    assert.equal(bombers.length, id === 8 ? 1 : 2)
    for (const bomber of bombers) {
      assert.ok(
        [...state.tiles.values()].some((tile) => {
          if (hexDist(bomber, tile) > 2) return false
          if (id === 8 && state.pawns.some((pawn) => pawn.q === tile.q && pawn.r === tile.r))
            return false
          const targets = bomber.special.areaTargets!(state.pawns, tile, bomber)
          return targets.length >= minimumHits && targets.every((pawn) => pawn.side === 'enemy')
        }),
        'Safe multi-target bomb in level ' + id,
      )
    }
  }
})

test('Powder Lesson groups two bowmen above the swordsmen within one advanced bomb blast', () => {
  const level = original.levels[7]
  assert.deepEqual(
    level.setup.enemy.filter((pawn) => pawn.kind === 'archer'),
    [
      { kind: 'archer', col: 3, row: 4 },
      { kind: 'archer', col: 4, row: 4 },
    ],
  )
  const state = coreState(level.seed, level.setup)
  const bomber = state.pawns.find((pawn) => pawn.side === 'player' && pawn.kind === 'bomber')!
  const moved = reducer(
    { ...state, active: state.order.indexOf(bomber.id) },
    { type: 'move', ...hexOf(3, 7) },
  )
  const fired = reducer(reducer(moved, { type: 'act', action: 'special' }), {
    type: 'specialAt',
    ...hexOf(3, 5),
  })
  for (const pawn of fired.pawns) {
    const damaged = pawn.side === 'enemy' && pawn.kind !== 'king'
    assert.equal(pawn.hp, pawn.maxHp - Number(damaged))
  }
  assert.equal(fired.pawns.find((pawn) => pawn.id === bomber.id)?.energy, 0)
})

test('Wizard Curtain has four aligned casters and Hell has two connected double-width gates', () => {
  const level = original.levels[15]
  const state = coreState(level.seed, level.setup)
  const wizards = state.pawns.filter(
    (pawn) => pawn.kind === 'magician' && pawn.side === 'enemy',
  )
  const mage = state.pawns.find((pawn) => pawn.kind === 'magician' && pawn.side === 'player')!
  assert.equal(wizards.length, 4)
  assert.deepEqual(mage.special.areaTargets!(state.pawns, wizards[0], mage), wizards)
  const gates = original.levels[16]
  for (const row of gates.setup.map.slice(5, 7))
    assert.deepEqual(
      [...row].flatMap((tile, col) => (tile !== '^' && tile !== '_' ? [col] : [])),
      [2, 3, 5, 6],
    )
  const passages = new Map(
    [...coreState(gates.seed, gates.setup).tiles].filter(
      ([, tile]) => tile.r === 5 || tile.r === 6,
    ),
  )
  for (const col of [2, 5]) assert.equal(distFrom(passages, [hexOf(col, 5)]).size, 4)
  assert.equal(gates.setup.map[5][2], 'W')
  assert.equal(gates.setup.map[6][5], 'H')
})

test('Campaign progress unlocks exactly the next level, never regresses, and stops at twenty', () => {
  let completed = 0
  for (let level = 1; level <= 20; level++) {
    for (let candidate = 1; candidate <= 20; candidate++)
      assert.equal(isLevelUnlocked(original, candidate, completed), candidate <= level)
    assert.equal(completeCampaignLevel(original, completed, level + 1), completed)
    completed = completeCampaignLevel(original, completed, level)
    assert.equal(completed, level)
    assert.equal(completeCampaignLevel(original, completed, 1), level)
    assert.equal(completeCampaignLevel(original, completed, level), level)
    assert.equal(parseCampaignProgress(String(completed), original.levels.length), completed)
  }
  for (const level of [-1, 0, 1.5, 21, NaN, Infinity]) {
    assert.equal(isLevelUnlocked(original, level, completed), false)
    assert.equal(completeCampaignLevel(original, completed, level), completed)
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
    assert.equal(parseCampaignProgress(value, original.levels.length), 0)
  assert.equal(parseCampaignProgress('0', original.levels.length), 0)
  assert.equal(parseCampaignProgress('19', original.levels.length), 19)
  assert.equal(parseCampaignProgress('20', original.levels.length), 20)
  assert.equal(parseCampaignProgress('20', brutal.levels.length), 20)
  assert.equal(parseCampaignProgress('21', brutal.levels.length), 0)
})
