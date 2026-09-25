import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BIOMES,
  initialState,
  reducer,
  activePawn,
  key,
  passable,
  distFrom,
  MAP_WIDTH,
  MAP_HEIGHT,
  type BattleSetup,
  type Biome,
  type Pawn,
} from '../src/lib/engine/index.ts'
import { chooseBotActions, createBotGame } from '../src/lib/engine/bot.ts'
import { nearestTarget } from '../src/lib/engine/bot.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import { seedState } from '../src/lib/engine/random.ts'

const encounter = {
  biome: 'desert',
  player: ['king', 'swordsman', 'archer'],
  enemy: ['king', 'swordsman', 'swordsman', 'magician', 'ninja'],
} as const satisfies BattleSetup

test('Authored setups control both army sizes and classes with legal deterministic spawns', () => {
  const recruits = ['swordsman', 'archer', 'magician', 'ninja', 'bulwark'] as const
  const army = (size: number): Pawn['kind'][] => [
    'king',
    ...Array.from({ length: size - 1 }, (_, index) => recruits[index % recruits.length]),
  ]
  for (const biome of Object.keys(BIOMES) as Biome[]) {
    for (const [player, enemy] of [
      [1, 1],
      [3, 7],
      [8, 2],
      [24, 24],
    ]) {
      const setup: BattleSetup = { biome, player: army(player), enemy: army(enemy) }
      const before = structuredClone(setup)
      const state = initialState('authored-battle', setup)
      assert.deepEqual(setup, before)
      assert.deepEqual(state, initialState(state.seed, JSON.parse(JSON.stringify(setup))))
      assert.equal(state.biome, biome)
      assert.equal(state.tiles.size, MAP_WIDTH * MAP_HEIGHT)
      assert.equal(state.pawns.length, player + enemy)
      assert.deepEqual(
        state.pawns.map((pawn) => pawn.id).toSorted((a, b) => a - b),
        Array.from({ length: player + enemy }, (_, i) => i + 1),
      )
      assert.equal(new Set(state.pawns.map((pawn) => key(pawn.q, pawn.r))).size, player + enemy)
      assert.deepEqual(
        state.order,
        state.pawns.toSorted((a, b) => a.id - b.id).map((pawn) => pawn.id),
      )
      assert.equal(state.active, 0)
      assert.equal(state.round, 1)
      assert.equal(state.winner, null)
      for (const side of ['player', 'enemy'] as const) {
        const pawns = state.pawns.filter((pawn) => pawn.side === side)
        assert.deepEqual(
          pawns.map((pawn) => pawn.kind),
          setup[side],
        )
        const firstRow = side === 'player' ? MAP_HEIGHT - 3 : 0
        for (const pawn of pawns) {
          assert.ok(pawn.r >= firstRow && pawn.r < firstRow + 3)
          assert.ok(passable(state.tiles.get(key(pawn.q, pawn.r))))
          assert.equal(pawn.hp, pawn.maxHp)
          assert.equal(pawn.energy, pawn.maxEnergy)
          assert.equal(pawn.escapeChance, 0)
          assert.equal(pawn.specialUsed, false)
          assert.equal(pawn.clone().kind, pawn.kind)
        }
      }
      assert.equal(
        distFrom(state.tiles, [state.pawns[0]]).size,
        [...state.tiles.values()].filter(passable).length,
      )
    }
  }
})

test('Player Bulwarks start on row 10 in seeded games and keep their positions on restart', () => {
  const columns = new Set<number>()
  for (const mode of ['ai', 'local'] as const) {
    for (let index = 0; index < 100; index++) {
      const opening = initialPlayback('bulwark-row-' + index, mode)
      const { state } = opening
      for (const pawn of state.pawns.filter(
        (p) => p.side === 'player' && p.kind === 'bulwark',
      )) {
        assert.equal(pawn.r, 9)
        assert.ok(passable(state.tiles.get(key(pawn.q, pawn.r))))
        columns.add(pawn.q)
      }
      assert.equal(new Set(state.pawns.map((p) => key(p.q, p.r))).size, state.pawns.length)
      assert.deepEqual(playbackReducer(opening, { type: 'restart' }, mode), opening)
    }
  }
  assert.ok(columns.size > 1)
})

test('Row 10 is reserved for all player Bulwarks before placing the rest of a full army', () => {
  const setup: BattleSetup = {
    biome: 'desert',
    player: [
      'king',
      ...Array<Pawn['kind']>(15).fill('swordsman'),
      ...Array<Pawn['kind']>(8).fill('bulwark'),
    ],
    enemy: ['king'],
  }
  const state = initialState('full-bulwark-row', setup)
  const bulwarks = state.pawns.filter((p) => p.kind === 'bulwark')
  assert.equal(bulwarks.length, 8)
  assert.ok(bulwarks.every((p) => p.r === 9))
  assert.equal(new Set(state.pawns.map((p) => key(p.q, p.r))).size, state.pawns.length)
  assert.deepEqual(reducer(state, { type: 'restart' }), state)
})

test('Setup snapshots survive caller edits, combat changes and restarts without sharing mutable input', () => {
  const setup = {
    biome: encounter.biome,
    player: [...encounter.player],
    enemy: [...encounter.enemy],
  }
  const state = initialState('snapshot', setup)
  const original = initialState('snapshot', encounter)
  assert.notEqual(state.setup, setup)
  assert.notEqual(state.setup?.player, setup.player)
  assert.notEqual(state.setup?.enemy, setup.enemy)
  setup.player.length = 0
  setup.enemy.reverse()
  state.pawns[0].hp = 1
  state.pawns.pop()
  state.tiles.clear()
  assert.deepEqual(reducer(state, { type: 'restart' }), original)
  assert.deepEqual(initialState('snapshot', encounter), original)
})

test('Authored encounters replay and restart identically through AI and local playback', () => {
  const bot = createBotGame()
  const openingSides = new Set<string>()
  for (let index = 0; index < 10; index++) {
    const seed = 'campaign-' + index
    const core = initialState(seed, encounter)
    openingSides.add(activePawn(core)!.side)
    assert.deepEqual(initialPlayback(seed, 'local', encounter), { state: core, frames: [] })
    assert.deepEqual(
      initialPlayback(seed, 'ai', encounter),
      bot.initialTransition(seed, encounter),
    )
    assert.deepEqual(
      bot.initialState(seed, encounter),
      bot.initialTransition(seed, encounter).state,
    )
    const opening = bot.initialTransition(seed, encounter)
    assert.deepEqual(bot.transition(opening.state, { type: 'restart' }), opening)
  }
  assert.deepEqual(openingSides, new Set(['player', 'enemy']))
  for (const mode of ['ai', 'local'] as const) {
    const opening = initialPlayback('campaign-1', mode, encounter)
    let playback = playbackReducer(opening, { type: 'playbackFinish' }, mode)
    for (let step = 0; step < 300 && !playback.state.winner; step++) {
      for (const action of chooseBotActions(playback.state, nearestTarget)) {
        const before = structuredClone(playback)
        const result = playbackReducer(playback, action, mode)
        assert.deepEqual(result, playbackReducer(playback, action, mode))
        assert.deepEqual(structuredClone(playback), before)
        assert.deepEqual(result.state.setup, encounter)
        if (result.frames.length)
          assert.equal(playbackReducer(result, { type: 'endTurn' }, mode), result)
        playback = playbackReducer(result, { type: 'playbackFinish' }, mode)
      }
    }
    assert.ok(playback.state.winner, mode + ' must finish the authored battle')
    assert.deepEqual(playbackReducer(playback, { type: 'restart' }, mode), opening)
  }
})

test('Opening pawn numbers follow the final initiative in every mode, including AI rotation', () => {
  const startingSides = new Set<string>()
  for (const setup of [undefined, encounter]) {
    for (let index = 0; index < 10; index++) {
      const seed = 'setup-compatibility-' + index
      const core = initialState(seed, setup)
      startingSides.add(activePawn(core)!.side)
      const initiative = core.order.map((id) => core.pawns.find((pawn) => pawn.id === id)!)
      const firstPlayer = initiative.findIndex((pawn) => pawn.side === 'player')
      const withoutId = ({ id: _id, ...pawn }: Pawn) => pawn
      for (const mode of ['ai', 'local', 'online'] as const) {
        const opening = initialPlayback(seed, mode, setup)
        const { state } = opening
        assert.deepEqual(
          state.order,
          Array.from({ length: state.pawns.length }, (_, i) => i + 1),
        )
        assert.equal(activePawn(state)!.id, 1)
        const expected =
          mode === 'ai'
            ? [...initiative.slice(firstPlayer), ...initiative.slice(0, firstPlayer)]
            : initiative
        assert.deepEqual(
          state.order.map((id) => withoutId(state.pawns.find((pawn) => pawn.id === id)!)),
          expected.map(withoutId),
        )
        assert.equal(state.randomState, core.randomState)
        assert.deepEqual(state.tiles, core.tiles)
        assert.deepEqual(playbackReducer(opening, { type: 'restart' }, mode), opening)
      }
    }
  }
  assert.deepEqual(startingSides, new Set(['player', 'enemy']))
})

test('Invalid setups reject unknown classes, invalid biomes, oversized armies and missing kings', () => {
  const invalid: unknown[] = [
    null,
    {},
    { ...encounter, biome: 'ocean' },
    { ...encounter, biome: 'toString' },
  ]
  for (const side of ['player', 'enemy']) {
    for (const army of [
      [],
      ['swordsman'],
      ['king', 'king'],
      ['king', 'dragon'],
      ['king', 'toString'],
      ['king', 1],
      ['king', undefined],
      ['king', ...Array(24).fill('swordsman')],
      new Array(3),
      'king',
      null,
    ])
      invalid.push({ ...encounter, [side]: army })
  }
  for (const setup of invalid)
    assert.throws(() => initialState('invalid', setup as BattleSetup), /setup|army/)
})

test('Seed-only battles have stable terrain, armies, initiative and random stream', () => {
  const states = Array.from({ length: 30 }, (_, index) =>
    initialState('setup-compatibility-' + index),
  )
  assert.equal(
    seedState(
      JSON.stringify(
        states.map(({ hellfire, ...state }) => {
          assert.deepEqual(hellfire, [])
          return { ...state, tiles: [...state.tiles] }
        }),
      ),
    ),
    3811068134,
  )
  for (const state of states) {
    assert.deepEqual(initialState(state.seed, undefined), state)
    assert.deepEqual(reducer(state, { type: 'restart' }), state)
  }
})
