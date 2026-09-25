import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  initialState,
  reducer,
  mapFromRows,
  hexOf,
  hexDist,
  key,
  canAttack,
  distFrom,
  walkingPaths,
  jumpDestinations,
  Ninja,
  Archer,
  type BattleSetup,
  type FixedBattleSetup,
} from '../src/lib/engine/index.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import { CAMPAIGNS } from '../src/lib/campaign.ts'

const layout = {
  biome: 'mountains',
  map: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '^^^.^^^^',
    '^^^.^^^^',
    '........',
    '........',
    '........',
    '........',
    '........',
  ],
  player: [
    { kind: 'king', col: 3, row: 10 },
    { kind: 'archer', col: 2, row: 7 },
  ],
  enemy: [
    { kind: 'king', col: 3, row: 1 },
    { kind: 'archer', col: 2, row: 4 },
  ],
} as const satisfies FixedBattleSetup

test('Authored terrain symbols and offset coordinates map exactly to the hex board', () => {
  const rows = ['.f^~s...', ...Array(11).fill('........')]
  const tiles = mapFromRows(rows)
  assert.equal(tiles.size, 96)
  assert.deepEqual(
    [...tiles.values()].slice(0, 5).map((tile) => tile.terrain),
    ['plain', 'forest', 'mountain', 'lake', 'sand'],
  )
  for (let row = 0; row < 12; row++)
    for (let col = 0; col < 8; col++) {
      const position = hexOf(col, row)
      assert.deepEqual(
        {
          q: tiles.get(key(position.q, position.r))!.q,
          r: tiles.get(key(position.q, position.r))!.r,
        },
        position,
      )
    }
  tiles.get('0,0')!.terrain = 'lake'
  assert.equal(rows[0], '.f^~s...')
})

test('Authored outlines preserve coordinates across ragged rows, holes and empty rows', () => {
  for (const rows of [
    ['.'],
    ['_...', '.....', '.._..', '.....', '_...'],
    ['..', '', '_..'],
    ['___', '__.', '', '.'],
    Array<string>(13).fill('.........'),
  ]) {
    const tiles = mapFromRows(rows)
    assert.equal(tiles.size, rows.join('').replaceAll('_', '').length)
    for (const [row, line] of rows.entries()) {
      for (let col = 0; col <= line.length; col++) {
        const { q, r } = hexOf(col, row)
        assert.deepEqual(
          tiles.get(key(q, r)),
          line[col] === '.' ? { q, r, terrain: 'plain' } : undefined,
        )
      }
    }
  }
})

test('Authored placements and army capacity follow the tiles rather than 8 by 12 bounds', () => {
  const setup: FixedBattleSetup = {
    biome: 'verdant',
    map: Array<string>(13).fill('.........'),
    player: [
      { kind: 'king', col: 8, row: 12 },
      ...Array.from({ length: 24 }, (_, i) => ({
        kind: 'archer' as const,
        col: i % 8,
        row: 9 + Math.floor(i / 8),
      })),
    ],
    enemy: [{ kind: 'king', col: 0, row: 0 }],
  }
  const state = initialState('large-layout', setup)
  assert.equal(state.tiles.size, 117)
  assert.equal(state.pawns.length, 26)
  assert.deepEqual({ q: state.pawns[0].q, r: state.pawns[0].r }, hexOf(8, 12))
  assert.deepEqual(reducer(state, { type: 'restart' }), state)
  for (const [col, row] of [
    [0, 0],
    [2, 0],
    [1, 2],
    [0, 3],
  ]) {
    assert.throws(
      () =>
        initialState('void-spawn', {
          biome: 'verdant',
          map: ['_.', '.._', '.'],
          player: [{ kind: 'king', col, row }],
          enemy: [{ kind: 'king', col: 0, row: 1 }],
        }),
      /terrain|position/,
    )
  }
  assert.throws(
    () =>
      initialState('small-layout', {
        ...setup,
        map: ['..'],
      }),
    /army/,
  )
})

test('Holes block walking and landing, but permit detours, ranged attacks and jumps', () => {
  const setup: FixedBattleSetup = {
    biome: 'verdant',
    map: ['_...', '.....', '.._..', '.....', '_...'],
    player: [
      { kind: 'swordsman', col: 1, row: 2 },
      { kind: 'king', col: 1, row: 4 },
    ],
    enemy: [{ kind: 'king', col: 1, row: 0 }],
  }
  const state = initialState('ring-layout', setup)
  state.order = state.pawns.map((pawn) => pawn.id)
  state.active = 0
  const pawn = state.pawns[0]
  const hole = hexOf(2, 2)
  const destination = hexOf(3, 2)
  const position = key(destination.q, destination.r)
  assert.equal(reducer(state, { type: 'move', ...hole }), state)
  assert.ok(!walkingPaths(state.tiles, state.pawns, pawn, 2).has(position))
  assert.equal(walkingPaths(state.tiles, state.pawns, pawn).get(position)?.path.length, 3)
  const moved = reducer(state, { type: 'move', ...destination }).pawns[0]
  assert.deepEqual({ q: moved.q, r: moved.r }, destination)
  const ninja = new Ninja(1, pawn.q, pawn.r, 'player')
  const jumps = jumpDestinations(state.tiles, [ninja, ...state.pawns.slice(1)], ninja)
  assert.ok(jumps.some((tile) => key(tile.q, tile.r) === position))
  assert.ok(!jumps.some((tile) => tile.q === hole.q && tile.r === hole.r))
  const archer = new Archer(1, pawn.q, pawn.r, 'player')
  assert.ok(canAttack(archer, new Archer(4, destination.q, destination.r, 'enemy')))
  for (const mode of ['ai', 'local'] as const) {
    const opening = initialPlayback('ring-layout', mode, setup)
    let playback = playbackReducer(opening, { type: 'playbackFinish' }, mode)
    playback = playbackReducer(playback, { type: 'endTurn' }, mode)
    playback = playbackReducer(playback, { type: 'playbackFinish' }, mode)
    assert.ok(playback.state.pawns.every((unit) => state.tiles.has(key(unit.q, unit.r))))
    assert.deepEqual(playbackReducer(playback, { type: 'restart' }, mode), opening)
  }
})

test('Campaign maps and character placements are explicit and independent of the seed', () => {
  for (const level of CAMPAIGNS[0].levels) {
    const original = structuredClone(level.setup)
    const first = initialState(level.seed, level.setup)
    const differentSeed = initialState(level.seed + '-different', level.setup)
    assert.deepEqual(first.tiles, mapFromRows(level.setup.map))
    assert.deepEqual(first.tiles, differentSeed.tiles)
    assert.deepEqual(
      first.pawns.map(({ id: _id, ...pawn }) => pawn),
      differentSeed.pawns.map(({ id: _id, ...pawn }) => pawn),
    )
    assert.deepEqual(level.setup, original)
    for (const side of ['player', 'enemy'] as const) {
      assert.deepEqual(
        first.pawns
          .filter((pawn) => pawn.side === side)
          .map((pawn) => ({
            kind: pawn.kind,
            col: pawn.q + Math.floor(pawn.r / 2),
            row: pawn.r,
          })),
        level.setup[side],
      )
    }
  }
})

test('Authored maps and placements survive input mutation and restart in both modes', () => {
  const setup = {
    ...layout,
    map: [...layout.map],
    player: layout.player.map((unit) => ({ ...unit })),
    enemy: layout.enemy.map((unit) => ({ ...unit })),
  }
  const state = initialState('layout-copy', setup)
  const original = initialState('layout-copy', layout)
  setup.map[5] = '........'
  setup.player[1].col = setup.player[0].col
  setup.enemy.reverse()
  state.tiles.clear()
  state.pawns.pop()
  assert.deepEqual(reducer(state, { type: 'restart' }), original)
  for (const mode of ['ai', 'local'] as const) {
    const opening = initialPlayback('layout-restart', mode, layout)
    let playback = playbackReducer(opening, { type: 'playbackFinish' }, mode)
    playback = playbackReducer(playback, { type: 'endTurn' }, mode)
    playback = playbackReducer(playback, { type: 'playbackFinish' }, mode)
    assert.deepEqual(playbackReducer(playback, { type: 'restart' }, mode), opening)
  }
})

test('Invalid terrain, missing positions, blocked spawns, and overlaps are rejected', () => {
  for (const map of [
    null,
    [],
    [''],
    ['___', '', '__'],
    [null],
    [8],
    new Array(12),
    ['.......?', ...Array(11).fill('........')],
  ])
    assert.throws(
      () => initialState('invalid-map', { ...layout, map } as unknown as BattleSetup),
      /[Mm]ap/,
    )
  const invalid: unknown[] = [
    { ...layout, map: undefined },
    { ...layout, player: ['king', 'archer'] },
    { ...layout, player: [{ kind: 'king' }] },
    { ...layout, player: [{ kind: 'king', col: 2, row: 5 }] },
    { ...layout, player: [{ kind: 'king', col: 3, row: 1 }] },
    { ...layout, player: [layout.player[0], { kind: 'archer', col: 3, row: 10 }] },
    {
      ...layout,
      map: ['~~~.....', ...layout.map.slice(1)],
      enemy: [{ kind: 'king', col: 1, row: 0 }],
    },
  ]
  for (const [col, row] of [
    [-1, 0],
    [8, 0],
    [0, -1],
    [0, 12],
    [1.5, 1],
    [1, 1.5],
    [Infinity, 1],
  ])
    invalid.push({ ...layout, player: [{ kind: 'king', col, row }] })
  for (const setup of invalid)
    assert.throws(
      () => initialState('invalid-position', setup as BattleSetup),
      /map|position|terrain|tile/,
    )
})

test('High Pass forces a walking detour while archers can fire across its mountain lines', () => {
  const level = CAMPAIGNS[0].levels[5]
  assert.equal(level.name, 'High Pass')
  const state = initialState(level.seed, level.setup)
  const archer = state.pawns.find((pawn) => pawn.side === 'player' && pawn.kind === 'archer')!
  const enemy = state.pawns.find((pawn) => pawn.side === 'enemy' && pawn.kind === 'archer')!
  assert.ok(canAttack(archer, enemy))
  assert.ok(
    distFrom(state.tiles, [enemy]).get(key(archer.q, archer.r))! > hexDist(archer, enemy),
  )
  state.order = [archer.id, ...state.order.filter((id) => id !== archer.id)]
  state.active = 0
  const mountain = hexOf(2, 6)
  assert.equal(state.tiles.get(key(mountain.q, mountain.r))!.terrain, 'mountain')
  assert.equal(reducer(state, { type: 'move', ...mountain }), state)
  const targeting = reducer(state, { type: 'act', action: 'attack' })
  const hit = reducer(targeting, { type: 'attackAt', q: enemy.q, r: enemy.r })
  assert.equal(
    hit.pawns.find((pawn) => pawn.id === enemy.id)!.hp,
    enemy.hp - archer.attack.damage,
  )
})
