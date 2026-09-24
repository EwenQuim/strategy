import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BIOMES,
  Bulwark,
  King,
  Ninja,
  Swordsman,
  activePawn,
  inHellfire,
  initialState,
  key,
  neighbors,
  reducer,
  transition,
  type Action,
  type Axial,
  type FixedBattleSetup,
  type GameState,
  type Pawn,
} from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/bot.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'

const encounter = {
  biome: 'hell',
  map: Array<string>(12).fill('bbbbbbbb'),
  player: [
    { kind: 'king', col: 1, row: 10 },
    { kind: 'swordsman', col: 6, row: 10 },
  ],
  enemy: [
    { kind: 'king', col: 1, row: 1 },
    { kind: 'swordsman', col: 6, row: 1 },
  ],
} as const satisfies FixedBattleSetup

function battle(pawns: Pawn[], hellfire: Axial[]): GameState {
  const tiles: GameState['tiles'] = new Map()
  for (let q = -6; q <= 6; q++)
    for (let r = -3; r <= 3; r++) tiles.set(key(q, r), { q, r, terrain: 'basalt' })
  return {
    ...initialState('hellfire-test', encounter),
    tiles,
    pawns,
    hellfire,
    order: pawns.map((pawn) => pawn.id),
    active: 0,
  }
}

function finishRound(state: GameState): GameState {
  const round = state.round
  const turns = state.order.length
  for (let turn = 0; turn < turns && state.round === round && !state.winner; turn++)
    state = reducer(state, { type: 'endTurn' })
  assert.ok(state.round === round + 1 || state.winner)
  return state
}

test('Hell is explicit-only, has basalt with small lava pools and short mountain chains, and starts seeded warnings beneath both armies', () => {
  assert.equal(BIOMES.hell.ground, 'basalt')
  assert.deepEqual(
    BIOMES.hell.features.map((feature) => feature.terrain),
    ['lava', 'mountain'],
  )
  const selected = { player: new Set<string>(), enemy: new Set<string>() }
  for (let index = 0; index < 30; index++) {
    const seed = 'hellfire-' + index
    const state = initialState(seed, encounter)
    assert.equal(state.round, 1)
    assert.equal(state.active, 0)
    assert.equal(state.hellfire.length, 2)
    assert.ok(state.pawns.every((pawn) => pawn.hp === pawn.maxHp))
    assert.deepEqual(initialState(seed, encounter), state)
    assert.deepEqual(
      state.hellfire,
      initialState(seed, { ...encounter, hellfireCount: 2 }).hellfire,
    )
    for (const side of ['player', 'enemy'] as const) {
      const marked = state.pawns.filter(
        (pawn) =>
          pawn.side === side &&
          state.hellfire.some((center) => center.q === pawn.q && center.r === pawn.r),
      )
      assert.equal(marked.length, 1)
      selected[side].add(key(marked[0].q, marked[0].r))
    }
    const random = initialState(seed)
    assert.notEqual(random.biome, 'hell')
    assert.deepEqual(random.hellfire, [])
  }
  assert.equal(selected.player.size, 2)
  assert.equal(selected.enemy.size, 2)
  const generated = initialState('explicit-hell', {
    biome: 'hell',
    player: ['king'],
    enemy: ['king'],
  })
  assert.equal(generated.biome, 'hell')
  assert.equal(generated.hellfire.length, 2)
  for (const terrain of ['lava', 'mountain'])
    assert.ok([...generated.tiles.values()].some((tile) => tile.terrain === terrain))
})

test('inHellfire covers the center and all six adjacent hexes, but not radius two', () => {
  const center = { q: -2, r: 3 }
  const centers = Object.freeze([Object.freeze(center)])
  for (const at of [center, ...neighbors(center.q, center.r)])
    assert.ok(inHellfire(centers, at))
  for (const at of neighbors(center.q, center.r)) {
    const outside = { q: center.q + 2 * (at.q - center.q), r: center.r + 2 * (at.r - center.r) }
    assert.equal(inHellfire(centers, outside), false)
  }
  assert.equal(inHellfire([], center), false)
  assert.ok(inHellfire([...centers, { q: 8, r: -4 }], { q: 8, r: -3 }))
})

test('One warning alternates player and enemy each full round and restarts deterministically', () => {
  const setup = { ...encounter, hellfireCount: 1 } as const
  const opening = initialState('alternating-hellfire', setup)
  let state = opening
  for (const side of ['player', 'enemy', 'player', 'enemy'] as const) {
    assert.equal(state.hellfire.length, 1)
    const center = state.hellfire[0]
    assert.equal(
      state.pawns.find((pawn) => pawn.q === center.q && pawn.r === center.r)?.side,
      side,
    )
    state = finishRound(state)
  }
  assert.deepEqual(reducer(state, { type: 'restart' }), opening)
  assert.deepEqual(transition(state, { type: 'restart' }), { state: opening, frames: [] })
})

test('Every unit gets its first full turn before damage, independent of targeting actions or energy spent', () => {
  let state = initialState('full-round-warning', encounter)
  const opening = structuredClone(state)
  for (let turn = 0; turn < state.order.length; turn++) {
    const before = state
    for (let preview = 0; preview < 5; preview++) {
      state = reducer(state, { type: 'act', action: 'attack' })
      state = reducer(state, { type: 'cancelTargeting' })
    }
    assert.deepEqual(state, before)
    assert.equal(state.round, 1)
    assert.ok(state.pawns.every((pawn) => pawn.hp === pawn.maxHp))
    const result = transition(state, { type: 'endTurn' })
    const fires = result.frames.filter((frame) => frame.effect?.kind === 'hellfire')
    assert.equal(fires.length, turn === state.order.length - 1 ? 1 : 0)
    state = result.state
  }
  assert.equal(state.round, 2)
  for (const pawn of state.pawns)
    assert.equal(pawn.hp, pawn.maxHp - Number(inHellfire(opening.hellfire, pawn)))

  const last = battle(
    [new King(1, -5, 0, 'player'), new King(2, 0, 0, 'enemy')],
    [{ q: 0, r: 0 }],
  )
  last.active = 1
  let moved = last
  for (const q of [1, 0]) {
    const result = transition(moved, { type: 'move', q, r: 0 })
    assert.equal(result.state.round, 1)
    assert.equal(result.state.pawns[1].hp, 7)
    assert.ok(!result.frames.some((frame) => frame.effect?.kind === 'hellfire'))
    moved = result.state
  }
  const exhausted = transition(moved, { type: 'move', q: 1, r: 0 })
  assert.equal(exhausted.state.round, 2)
  assert.equal(exhausted.state.pawns[1].hp, 6)
  assert.equal(exhausted.frames.filter((frame) => frame.effect?.kind === 'hellfire').length, 1)
})

test('Warnings stay on old tiles when units move, then retarget surviving positions after the blast', () => {
  const state = battle(
    [new King(1, 0, 0, 'player'), new King(2, 5, 0, 'enemy')],
    [
      { q: 0, r: 0 },
      { q: 5, r: 0 },
    ],
  )
  const original = structuredClone(state)
  const moved = reducer(state, { type: 'move', q: 2, r: 0 })
  assert.deepEqual(moved.hellfire, state.hellfire)
  assert.equal(inHellfire(moved.hellfire, moved.pawns[0]), false)
  const result = transition(reducer(moved, { type: 'endTurn' }), { type: 'endTurn' })
  assert.equal(result.state.pawns[0].hp, 7)
  assert.equal(result.state.pawns[1].hp, 6)
  assert.deepEqual(
    result.frames.find((frame) => frame.effect?.kind === 'hellfire')?.effect?.centers,
    state.hellfire,
  )
  assert.deepEqual(result.state.hellfire, [
    { q: 2, r: 0 },
    { q: 5, r: 0 },
  ])
  assert.deepEqual(structuredClone(state), original)
})

test('Overlapping blasts deal one direct HP per unit, ignoring Escape and Protect and preserving tiles', () => {
  const guard = new Bulwark(2, 2, 0, 'player')
  guard.protectingId = 1
  const state = battle(
    [
      new Swordsman(1, 0, 0, 'player', 5, 0, 60),
      guard,
      new King(3, -5, 0, 'player'),
      new King(4, 5, 0, 'enemy'),
    ],
    [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
    ],
  )
  state.tiles.get('0,0')!.feature = 'rune'
  state.tiles.get('-1,0')!.terrain = 'mountain'
  state.active = 3
  const original = structuredClone(state)
  const result = transition(state, { type: 'endTurn' })
  assert.deepEqual(result.state, reducer(state, { type: 'endTurn' }))
  assert.deepEqual(result, transition(state, { type: 'endTurn' }))
  assert.equal(result.state.pawns[0].hp, 4)
  assert.equal(result.state.pawns[1].hp, 10)
  assert.equal(result.state.pawns[1].protectingId, 1)
  assert.deepEqual(
    result.frames.find((frame) => frame.effect?.kind === 'hellfire')?.effect?.impacts,
    [{ q: 0, r: 0, damage: 1 }],
  )
  assert.deepEqual(result.state.tiles, state.tiles)
  assert.deepEqual(structuredClone(state), original)
})

test('Hellfire removes deaths and broken protection, skips trailing dead order IDs, and snapshots the dead', () => {
  const guard = new Bulwark(3, 2, 0, 'player')
  guard.protectingId = 1
  const state = battle(
    [
      new Ninja(1, 0, 0, 'player'),
      new Ninja(2, 1, 0, 'enemy'),
      guard,
      new King(4, -5, 0, 'player'),
      new King(5, 5, 0, 'enemy'),
    ],
    [{ q: 0, r: 0 }],
  )
  state.order = [1, 2, 4, 3, 5, 99, 100]
  state.active = 4
  const original = structuredClone(state)
  const result = transition(state, { type: 'endTurn' })
  assert.equal(result.state.round, 2)
  assert.deepEqual(result.state.order, [4, 3, 5])
  assert.equal(activePawn(result.state)?.id, 4)
  assert.equal(result.state.pawns.find((pawn) => pawn.id === 3)?.protectingId, null)
  assert.ok(result.state.pawns.every((pawn) => pawn.hp > 0))
  assert.ok(
    result.state.hellfire.every((center) =>
      result.state.pawns.some((pawn) => pawn.q === center.q && pawn.r === center.r),
    ),
  )
  const fire = result.frames.find((frame) => frame.effect?.kind === 'hellfire')!
  assert.deepEqual(fire.effect?.impacts, [
    { q: 0, r: 0, damage: 1 },
    { q: 1, r: 0, damage: 1 },
  ])
  assert.equal(fire.state.pawns.find((pawn) => pawn.id === 1)?.hp, 0)
  assert.equal(fire.state.pawns.find((pawn) => pawn.id === 2)?.hp, 0)
  const saved = structuredClone(result.frames)
  finishRound(result.state)
  assert.deepEqual(structuredClone(result.frames), saved)
  assert.deepEqual(structuredClone(state), original)
})

test('Killing the remaining scheduled unit resolves Hellfire immediately after the last survivor finishes', () => {
  const state = battle(
    [
      new King(1, -5, 0, 'player'),
      new King(2, 5, 0, 'enemy'),
      new Swordsman(3, 0, 0, 'player', 5, 1),
      new Ninja(4, 1, 0, 'enemy'),
    ],
    [{ q: 0, r: 0 }],
  )
  state.active = 2
  state.order.push(99)
  const attack = reducer(state, { type: 'act', action: 'attack' })
  const result = transition(attack, { type: 'attackAt', q: 1, r: 0 })
  assert.equal(result.state.round, 2)
  assert.deepEqual(result.state.order, [1, 2, 3])
  assert.equal(result.state.pawns.find((pawn) => pawn.id === 3)?.hp, 4)
  assert.deepEqual(
    result.frames.map((frame) => frame.effect?.kind),
    ['attack', 'hellfire'],
  )
})

test('A final actor dying on lava still resolves the round once and skips dead order entries', () => {
  const state = battle(
    [new King(1, -5, 0, 'player'), new King(2, 5, 0, 'enemy'), new Ninja(3, 0, 0, 'player')],
    [{ q: -5, r: 0 }],
  )
  state.tiles.get('1,0')!.terrain = 'lava'
  state.order.push(99)
  state.active = 2
  const result = transition(state, { type: 'move', q: 1, r: 0 })
  assert.equal(result.state.round, 2)
  assert.deepEqual(result.state.order, [1, 2])
  assert.equal(activePawn(result.state)?.id, 1)
  assert.equal(result.state.pawns[0].hp, 6)
  assert.deepEqual(
    result.frames.map((frame) => frame.effect?.kind),
    ['move', 'hellfire'],
  )
})

test('Losing just one king to Hellfire awards the other side victory without resetting the round', () => {
  for (const side of ['player', 'enemy'] as const) {
    const other = side === 'player' ? 'enemy' : 'player'
    const state = battle(
      [new King(1, 0, 0, side, 1), new King(2, 5, 0, other)],
      [{ q: 0, r: 0 }],
    )
    state.active = 1
    const next = reducer(state, { type: 'endTurn' })
    assert.equal(next.winner, other)
    assert.equal(next.phase, 'over')
    assert.equal(next.round, 1)
    assert.deepEqual(
      next.pawns.map((pawn) => pawn.id),
      [2],
    )
  }
})

test('Simultaneous king deaths are a terminal draw, never a player victory or an extra round', () => {
  for (const reverse of [false, true]) {
    const pawns = [new King(1, 0, 0, 'player', 1), new King(2, 3, 0, 'enemy', 1)]
    if (reverse) pawns.reverse()
    const state = battle(pawns, [
      { q: 0, r: 0 },
      { q: 3, r: 0 },
    ])
    state.active = 1
    const original = structuredClone(state)
    const result = transition(state, { type: 'endTurn' })
    assert.equal(result.state.winner, 'draw')
    assert.equal(result.state.phase, 'over')
    assert.equal(result.state.round, 1)
    assert.equal(result.state.randomState, state.randomState)
    assert.deepEqual(result.state.pawns, [])
    const fire = result.frames.find((frame) => frame.effect?.kind === 'hellfire')!
    assert.equal(fire.effect?.impacts?.length, 2)
    assert.ok(fire.state.pawns.every((pawn) => pawn.hp === 0))
    assert.deepEqual(result.state, reducer(state, { type: 'endTurn' }))
    for (const action of [
      { type: 'endTurn' },
      { type: 'move', q: 1, r: 0 },
      { type: 'act', action: 'attack' },
    ] satisfies Action[]) {
      assert.equal(reducer(result.state, action), result.state)
      assert.deepEqual(transition(result.state, action).frames, [])
    }
    assert.deepEqual(structuredClone(state), original)
  }
})

test('Reducer, transitions and local action replay agree through several blasts and restart', () => {
  const opening = initialPlayback('hellfire-replay', 'local', encounter)
  let playback = opening
  let state = opening.state
  const actions: Action[] = []
  for (let step = 0; step < 12; step++) {
    const action = { type: 'endTurn' } as const
    actions.push(action)
    const original = structuredClone(playback)
    const result = transition(state, action)
    state = reducer(state, action)
    assert.deepEqual(state, result.state)
    const animated = playbackReducer(playback, action, 'local')
    assert.deepEqual(animated.state, state)
    assert.deepEqual(structuredClone(playback), original)
    playback = playbackReducer(animated, { type: 'playbackFinish' }, 'local')
    assert.deepEqual(actions.reduce(reducer, initialState(state.seed, encounter)), state)
  }
  assert.equal(state.round, 4)
  assert.deepEqual(playbackReducer(playback, { type: 'restart' }, 'local'), opening)
})

test('AI evaluates the post-blast winner and escapes a draw to win on the final turn', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const state = battle(
      [new King(1, 5, 0, 'player', 1), new King(2, 0, 0, 'enemy', 1)],
      [
        { q: 5, r: 0 },
        { q: 0, r: 0 },
      ],
    )
    state.active = 1
    assert.equal(reducer(state, { type: 'endTurn' }).winner, 'draw')
    let next = state
    for (let step = 0; step < 4 && !next.winner; step++)
      next = chooseBotActions(next, difficulty).reduce(reducer, next)
    assert.equal(next.winner, 'enemy', difficulty)
    assert.equal(next.round, 1)
  }
})

test('Other biomes never acquire warnings or take round-end damage', () => {
  for (const biome of Object.keys(BIOMES) as (keyof typeof BIOMES)[]) {
    if (biome === 'hell') continue
    const state = initialState('no-hellfire', { ...encounter, biome })
    assert.deepEqual(state.hellfire, [])
    const next = finishRound(state)
    assert.deepEqual(next.hellfire, [])
    assert.ok(next.pawns.every((pawn) => pawn.hp === pawn.maxHp))
  }
})

test('Every AI difficulty moves healthy soldiers and doomed kings outside radius one rather than ending in Hellfire', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    for (const king of [false, true]) {
      const actor = king ? new King(1, 0, 0, 'enemy', 1) : new Swordsman(1, 0, 0, 'enemy')
      const state = battle(
        [actor, ...(!king ? [new King(2, -6, 0, 'enemy')] : []), new King(3, 6, 0, 'player')],
        [{ q: 0, r: 0 }],
      )
      const original = structuredClone(state)
      let next = state
      for (
        let step = 0;
        step < 4 && activePawn(next)?.id === 1 && next.round === 1 && !next.winner;
        step++
      )
        next = chooseBotActions(next, difficulty).reduce(reducer, next)
      const survivor = next.pawns.find((pawn) => pawn.id === 1)
      assert.ok(survivor, difficulty)
      assert.equal(inHellfire(state.hellfire, survivor), false, difficulty)
      assert.equal(survivor.hp, actor.hp)
      assert.deepEqual(structuredClone(state), original)
    }
  }
})

test('AI leaves already-doomed enemies to Hellfire instead of wasting its last attack', () => {
  const state = battle(
    [
      new Swordsman(1, 0, 0, 'enemy', 5, 1),
      new King(2, 0, 1, 'enemy', 4, 0),
      new Bulwark(3, -1, 0, 'player', 1, 0),
      new Ninja(4, 1, 0, 'player', 1, 0),
      new King(5, 6, 0, 'player'),
    ],
    [{ q: 2, r: 0 }],
  )
  state.order = [4, 3, 2, 1, 5]
  state.active = 3
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const actions = chooseBotActions(state, difficulty)
    assert.deepEqual(
      actions,
      [
        { type: 'act', action: 'attack' },
        { type: 'attackAt', q: -1, r: 0 },
      ],
      difficulty,
    )
    const next = finishRound(actions.reduce(reducer, state))
    assert.ok(!next.pawns.some((pawn) => pawn.id === 3 || pawn.id === 4), difficulty)
  }
})
