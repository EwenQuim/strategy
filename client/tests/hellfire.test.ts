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
  reducer,
  transition,
  type Axial,
  type FixedBattleSetup,
  type GameState,
  type Pawn,
} from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/bot.ts'
import { playbackReducer } from '../src/lib/playback.ts'

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
  for (
    let turn = 0;
    turn < state.order.length && state.round === round && !state.winner;
    turn++
  )
    state = reducer(state, { type: 'endTurn' })
  assert.ok(state.round === round + 1 || state.winner)
  return state
}

test('Seeded warnings mark both armies, or alternate sides with one warning, and restart identically', () => {
  for (const hellfireCount of [1, 2] as const) {
    const opening = initialState('alternating-hellfire', { ...encounter, hellfireCount })
    assert.deepEqual(initialState(opening.seed, opening.setup), opening)
    assert.ok(opening.pawns.every((pawn) => pawn.hp === pawn.maxHp))
    let state = opening
    for (const side of ['player', 'enemy', 'player'] as const) {
      assert.deepEqual(
        state.hellfire.map(
          (center) => state.pawns.find((p) => p.q === center.q && p.r === center.r)?.side,
        ),
        hellfireCount === 1 ? [side] : ['player', 'enemy'],
      )
      state = finishRound(state)
    }
    assert.deepEqual(reducer(state, { type: 'restart' }), opening)
  }
})

test('Warnings stay fixed through movement and resolve once when the last actor exhausts energy', () => {
  const state = battle(
    [new King(1, 0, 0, 'player'), new King(2, 5, 0, 'enemy')],
    [
      { q: 0, r: 0 },
      { q: 5, r: 0 },
    ],
  )
  let next = state
  for (const action of [
    { type: 'move', q: 2, r: 0 },
    { type: 'endTurn' },
    { type: 'move', q: 4, r: 0 },
    { type: 'move', q: 5, r: 0 },
  ] as const) {
    const result = transition(next, action)
    assert.equal(result.state.round, 1)
    assert.ok(result.state.pawns.every((p) => p.hp === p.maxHp))
    assert.deepEqual(result.state.hellfire, state.hellfire)
    assert.ok(!result.frames.some((frame) => frame.effect?.kind === 'hellfire'))
    next = result.state
  }
  const result = transition(next, { type: 'move', q: 4, r: 0 })
  assert.equal(result.state.round, 2)
  assert.deepEqual(
    result.state.pawns.map((p) => p.hp),
    [7, 6],
  )
  assert.deepEqual(
    result.frames.map((frame) => frame.effect?.kind),
    ['move', 'hellfire'],
  )
  assert.deepEqual(result.frames[1].effect?.centers, state.hellfire)
  assert.deepEqual(result.state.hellfire, [
    { q: 2, r: 0 },
    { q: 4, r: 0 },
  ])
})

test('Overlap damages once through Escape and Protect, cleans up deaths, and preserves prior states and frames', () => {
  const guard = new Bulwark(3, 2, 0, 'player')
  guard.protectingId = 2
  const state = battle(
    [
      new Swordsman(1, -1, 1, 'player', 5, 0, 60),
      new Ninja(2, 0, 0, 'player', 1, 0, 60),
      guard,
      new King(4, -5, 0, 'player'),
      new King(5, 5, 0, 'enemy'),
    ],
    [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
    ],
  )
  state.active = 4
  state.tiles.get('0,0')!.feature = 'rune'
  const original = structuredClone(state)
  const result = transition(state, { type: 'endTurn' })
  assert.deepEqual(result.state.order, [1, 3, 4, 5])
  assert.deepEqual(
    result.state.pawns.map((p) => p.hp),
    [4, 10, 7, 7],
  )
  assert.equal(result.state.pawns[1].protectingId, null)
  assert.deepEqual(result.state.tiles, state.tiles)
  const fire = result.frames.find((frame) => frame.effect?.kind === 'hellfire')!
  assert.deepEqual(fire.effect?.impacts, [
    { q: -1, r: 1, damage: 1 },
    { q: 0, r: 0, damage: 1 },
  ])
  assert.equal(fire.state.pawns.find((p) => p.id === 2)?.hp, 0)
  const frames = structuredClone(result.frames)
  result.state.pawns[0].hp--
  result.state.hellfire[0].q++
  assert.deepEqual(structuredClone(result.frames), frames)
  assert.deepEqual(structuredClone(state), original)
})

test('A killed final initiative entry or a final actor dying on lava still resolves exactly once', () => {
  for (const diesOnLava of [false, true]) {
    const state = battle(
      [
        new King(1, -5, 0, 'player'),
        new King(2, 5, 0, 'enemy'),
        ...(diesOnLava ? [] : [new Swordsman(3, 0, 0, 'player', 5, 1)]),
        new Ninja(4, diesOnLava ? 0 : 1, 0, 'enemy'),
      ],
      [{ q: -5, r: 0 }],
    )
    state.active = 2
    state.order.push(99)
    state.tiles.get('1,0')!.terrain = diesOnLava ? 'lava' : 'basalt'
    state.phase = diesOnLava ? 'move' : 'attack'
    const result = transition(state, { type: diesOnLava ? 'move' : 'attackAt', q: 1, r: 0 })
    assert.equal(result.state.round, 2)
    assert.deepEqual(result.state.order, diesOnLava ? [1, 2] : [1, 2, 3])
    assert.equal(activePawn(result.state)?.id, 1)
    assert.equal(result.state.pawns[0].hp, 6)
    assert.deepEqual(
      result.frames.map((frame) => frame.effect?.kind),
      [diesOnLava ? 'move' : 'attack', 'hellfire'],
    )
  }
})

test('Either king can lose to a blast; simultaneous deaths are a terminal draw without a new round', () => {
  for (const [playerHp, enemyHp, winner] of [
    [1, 7, 'enemy'],
    [7, 1, 'player'],
    [1, 1, 'draw'],
  ] as const) {
    const state = battle(
      [new King(1, 0, 0, 'player', playerHp), new King(2, 1, 0, 'enemy', enemyHp)],
      [{ q: 0, r: 0 }],
    )
    state.active = 1
    const result = transition(state, { type: 'endTurn' })
    assert.equal(result.state.winner, winner)
    assert.equal(result.state.phase, 'over')
    assert.equal(result.state.round, 1)
    assert.equal(result.state.randomState, state.randomState)
    assert.deepEqual(
      result.state.pawns.map((p) => p.side),
      winner === 'draw' ? [] : [winner],
    )
    const fire = result.frames.find((frame) => frame.effect?.kind === 'hellfire')!
    assert.deepEqual(
      fire.state.pawns.map((p) => p.hp),
      [playerHp - 1, enemyHp - 1],
    )
    assert.deepEqual(transition(result.state, { type: 'endTurn' }), {
      state: result.state,
      frames: [],
    })
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

test('An empty blast survives local and player-controlled playback filtering', () => {
  const state = battle(
    [new King(1, -5, 0, 'player'), new King(2, 5, 0, 'enemy')],
    [{ q: 0, r: 0 }],
  )
  state.order = [2, 1]
  state.active = 1
  for (const mode of ['local', 'ai'] as const) {
    const result = playbackReducer({ state, frames: [] }, { type: 'endTurn' }, mode)
    assert.equal(result.state.round, 2)
    const fires = result.frames.filter((frame) => frame.effect?.kind === 'hellfire')
    assert.equal(fires.length, 1)
    assert.deepEqual(fires[0].effect?.impacts, [])
  }
})

test('AI evades with a healthy soldier on easy and saves a doomed king on normal to win after the blast', () => {
  for (const [difficulty, actor] of [
    ['easy', new Swordsman(1, 0, 0, 'enemy')],
    ['normal', new King(1, 0, 0, 'enemy', 1)],
  ] as const) {
    const king = actor.kind === 'king'
    const state = battle(
      [
        new King(2, 5, 0, 'player', king ? 1 : 7),
        ...(!king ? [new King(3, -6, 0, 'enemy')] : []),
        actor,
      ],
      king
        ? [
            { q: 0, r: 0 },
            { q: 5, r: 0 },
          ]
        : [{ q: 0, r: 0 }],
    )
    state.active = state.order.length - 1
    if (king) assert.equal(reducer(state, { type: 'endTurn' }).winner, 'draw')
    let next = state
    for (let step = 0; step < 4 && next.round === 1 && !next.winner; step++)
      next = chooseBotActions(next, difficulty).reduce(reducer, next)
    const survivor = next.pawns.find((p) => p.id === actor.id)!
    assert.ok(survivor, difficulty)
    assert.equal(inHellfire(state.hellfire, survivor), false, difficulty)
    assert.equal(survivor.hp, actor.hp)
    assert.equal(next.winner, king ? 'enemy' : null)
    assert.equal(next.round, king ? 1 : 2)
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
  const actions = chooseBotActions(state, 'normal')
  assert.deepEqual(actions, [
    { type: 'act', action: 'attack' },
    { type: 'attackAt', q: -1, r: 0 },
  ])
  const next = finishRound(actions.reduce(reducer, state))
  assert.ok(!next.pawns.some((pawn) => pawn.id === 3 || pawn.id === 4))
})
