import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Archer,
  Bulwark,
  King,
  Magician,
  Bomber,
  Ninja,
  Swordsman,
  activePawn,
  hexDist,
  initialState,
  movementDestinations,
  protectorFor,
  reducer,
  specialTargets,
  targetingTiles,
  transition,
  type GameState,
  type Side,
  type Tile,
} from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/engine/bot.ts'
import { nearestTarget } from '../src/lib/engine/bot.ts'

function battle(side: Side = 'player'): GameState {
  const other = side === 'player' ? 'enemy' : 'player'
  const tiles = new Map<string, Tile>()
  for (let q = -3; q <= 4; q++) {
    for (let r = -3; r <= 4; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  }
  return {
    ...initialState('bulwark'),
    tiles,
    pawns: [
      new Bulwark(1, 0, 0, side),
      new King(2, 0, 1, side),
      new Ninja(3, 1, 0, side),
      new King(4, 4, 0, other),
      new Swordsman(5, 1, 1, other),
    ],
    order: [1, 5, 2, 3, 4],
    active: 0,
  }
}

function protect(state: GameState, id = 3): GameState {
  const ally = state.pawns.find((p) => p.id === id)!
  return reducer(reducer(state, { type: 'act', action: 'special' }), {
    type: 'specialAt',
    q: ally.q,
    r: ally.r,
  })
}

function attack(state: GameState, q = 1, r = 0) {
  return transition(reducer(state, { type: 'act', action: 'attack' }), {
    type: 'attackAt',
    q,
    r,
  })
}

test('Bulwarks pay 2 energy for the first tile and 1 for each extra tile, with identical previews and rules for both sides', () => {
  for (const side of ['player', 'enemy'] as const) {
    for (const energy of [0, 1, 2, 3]) {
      const state = battle(side)
      state.pawns[0].energy = energy
      const original = structuredClone(state)
      const reach = movementDestinations(state.tiles, state.pawns, state.pawns[0])
      assert.equal(reach.get('0,0'), 0)
      assert.equal(reach.get('-1,0'), energy >= 2 ? 2 : undefined)
      assert.equal(reach.get('-2,0'), energy >= 3 ? 3 : undefined)
      assert.equal(reach.has('1,0'), false)
      const next = reducer(state, { type: 'move', q: -1, r: 0 })
      if (energy < 2) assert.equal(next, state)
      else {
        assert.equal(next.pawns[0].energy, energy - 2)
        assert.equal(next.pawns[0].q, -1)
        assert.equal(activePawn(next)?.id, energy === 2 ? 5 : 1)
        assert.equal(reducer(next, { type: 'move', q: -2, r: 0 }), next)
      }
      if (energy === 3) {
        const two = reducer(state, { type: 'move', q: -2, r: 0 })
        assert.equal(two.pawns[0].energy, 0)
        assert.equal(two.pawns[0].q, -2)
        assert.equal(activePawn(two)?.id, 5)
      }
      for (const terrain of ['lake', 'mountain'] as const) {
        const blocked = { ...state, tiles: new Map(state.tiles) }
        blocked.tiles.set('-1,0', { q: -1, r: 0, terrain })
        assert.equal(reducer(blocked, { type: 'move', q: -1, r: 0 }), blocked)
      }
      assert.deepEqual(structuredClone(state), original)
    }
  }
})

test('Protect targets allies within two tiles, costs two energy, and can be cancelled freely', () => {
  for (const side of ['player', 'enemy'] as const) {
    const state = battle(side)
    const original = structuredClone(state)
    assert.deepEqual(
      specialTargets(state.pawns, state.pawns[0]).map((p) => p.id),
      [2, 3],
    )
    const preview = reducer(state, { type: 'act', action: 'special' })
    assert.deepEqual(targetingTiles(preview), new Set(['0,1', '1,0']))
    assert.deepEqual(reducer(preview, { type: 'cancelTargeting' }), state)
    for (const [q, r] of [
      [0, 0],
      [1, 1],
      [4, 0],
      [99, 99],
    ]) {
      assert.equal(reducer(preview, { type: 'specialAt', q, r }), preview)
    }
    assert.equal(reducer(state, { type: 'specialAt', q: 1, r: 0 }), state)
    const guarded = protect(state)
    assert.equal(guarded.pawns[0].protectingId, 3)
    assert.equal(guarded.pawns[0].energy, 1)
    assert.equal(guarded.randomState, state.randomState)
    assert.equal(guarded.phase, 'move')
    assert.equal(protectorFor(guarded.pawns, guarded.pawns[2])?.id, 1)
    assert.equal(reducer(guarded, { type: 'act', action: 'special' }), guarded)
    assert.deepEqual(structuredClone(state), original)
    state.pawns[0].energy = 2
    const result = transition(reducer(state, { type: 'act', action: 'special' }), {
      type: 'specialAt',
      q: 1,
      r: 0,
    })
    assert.equal(activePawn(result.state)?.id, 5)
    assert.equal(result.state.pawns[0].energy, 0)
    assert.equal(result.state.pawns[0].protectingId, 3)
    assert.equal(result.frames[0].effect?.kind, 'protect')
  }
})

test('Protect redirects exactly one successful hit and records damage at the Bulwark', () => {
  for (const side of ['player', 'enemy'] as const) {
    const state = reducer(protect(battle(side)), { type: 'endTurn' })
    const original = structuredClone(state)
    const first = attack(state)
    assert.equal(first.state.pawns.find((p) => p.id === 3)?.hp, 1)
    assert.equal(first.state.pawns[0].hp, 8)
    assert.equal(first.state.pawns[0].protectingId, null)
    assert.deepEqual(first.frames[0].effect?.impacts, [{ q: 0, r: 0, damage: 2 }])
    assert.deepEqual(attack(state), first)
    assert.deepEqual(structuredClone(state), original)
    const second = attack(first.state)
    assert.ok(!second.state.pawns.some((p) => p.id === 3))
    assert.equal(second.state.pawns[0].hp, 8)
  }
})

test('Misses preserve Protect; Aimed shot bypasses ally Escape with no second roll for the tank', () => {
  let state = reducer(protect(battle()), { type: 'endTurn' })
  state.pawns[2].escapeChance = 60
  state.pawns[0].escapeChance = 60
  state.randomState = 0
  const miss = attack(state)
  assert.equal(miss.state.pawns[0].protectingId, 3)
  assert.equal(miss.state.pawns[0].hp, 10)
  assert.deepEqual(miss.frames[0].effect?.impacts, [{ q: 1, r: 0, damage: 0 }])
  state = miss.state
  state.pawns[4] = new Archer(5, 3, 0, 'enemy')
  const shot = transition(reducer(state, { type: 'act', action: 'special' }), {
    type: 'specialAt',
    q: 1,
    r: 0,
  })
  assert.equal(shot.state.pawns[0].hp, 8)
  assert.equal(shot.state.pawns[2].hp, 1)
  assert.equal(shot.state.pawns[0].protectingId, null)
  assert.equal(shot.state.randomState, state.randomState)
})

test('Protect survives a round reset, but expires at the start of the Bulwark next turn', () => {
  let state = protect(battle())
  state.order = [5, 2, 3, 4, 1]
  state.active = 4
  for (let randomState = 0; randomState < 100; randomState++) {
    state.randomState = randomState
    const next = reducer(state, { type: 'endTurn' })
    if (activePawn(next)?.id === 1) continue
    assert.equal(next.round, 2)
    assert.equal(next.pawns[0].protectingId, 3)
    assert.equal(state.pawns[0].protectingId, 3)
    state = next
    while (activePawn(state)?.id !== 1) state = reducer(state, { type: 'endTurn' })
    assert.equal(state.pawns[0].protectingId, null)
    return
  }
  assert.fail('Expected a round where the Bulwark does not go first')
})

test('Separating from an ally ends Protect permanently, even if the ally returns', () => {
  let state = protect(battle())
  state.active = state.order.indexOf(3)
  state = reducer(state, { type: 'move', q: 2, r: 0 })
  assert.equal(state.pawns[0].protectingId, 3)
  assert.equal(protectorFor(state.pawns, state.pawns[2])?.id, 1)
  state = reducer(state, { type: 'move', q: 3, r: 0 })
  assert.equal(state.pawns[0].protectingId, null)
  state = reducer(state, { type: 'move', q: 2, r: 0 })
  assert.equal(state.pawns[0].protectingId, null)
  assert.equal(protectorFor(state.pawns, state.pawns[2]), undefined)
})

test('Area attacks combine direct and redirected hits at the Bulwark', () => {
  for (const Unit of [Magician, Bomber]) {
    for (const hp of [1, 2, 10]) {
      let state = reducer(protect(battle()), { type: 'endTurn' })
      state.pawns[0].hp = hp
      state.pawns[0].escapeChance = 0
      state.pawns[4] = new Unit(5, 2, 0, 'enemy')
      state.pawns = [
        state.pawns[2],
        state.pawns[0],
        state.pawns[1],
        state.pawns[3],
        state.pawns[4],
      ]
      const result = transition(reducer(state, { type: 'act', action: 'special' }), {
        type: 'specialAt',
        q: 1,
        r: 0,
      })
      const tank = result.state.pawns.find((p) => p.id === 1)
      assert.equal(tank?.hp, hp > 2 ? hp - 2 : undefined)
      assert.equal(result.state.pawns.find((p) => p.id === 3)?.hp, 1)
      assert.ok(result.state.pawns.some((p) => p.id === 5))
      assert.deepEqual(result.frames[0].effect?.impacts, [
        { q: 0, r: 0, damage: Math.min(hp, 2) },
        ...(Unit === Bomber
          ? [
              { q: 0, r: 1, damage: 1 },
              { q: 2, r: 0, damage: 1 },
            ]
          : []),
      ])
    }
  }
})

test('Protect is not chained between Bulwarks and never shields a king after its guardian dies', () => {
  let state = protect(battle(), 2)
  state.pawns[2] = new Bulwark(3, 1, 0, 'player')
  state.pawns[2].protectingId = 1
  state.pawns[0].hp = 1
  state = reducer(state, { type: 'endTurn' })
  const result = attack(state, 0, 1).state
  assert.ok(!result.pawns.some((p) => p.id === 1))
  assert.equal(result.pawns.find((p) => p.id === 3)?.hp, 10)
  assert.equal(result.pawns.find((p) => p.id === 3)?.protectingId, null)
  assert.equal(result.pawns.find((p) => p.id === 2)?.hp, 7)
  assert.equal(attack(result, 0, 1).state.pawns.find((p) => p.id === 2)?.hp, 5)
})

test('Bots protect threatened allies and never try to walk with only one energy', () => {
  for (const side of ['player', 'enemy'] as const) {
    const state = battle(side)
    const actions = chooseBotActions(state)
    assert.deepEqual(actions, [
      { type: 'act', action: 'special' },
      { type: 'specialAt', q: 0, r: 1 },
    ])
    let guarded = state
    for (const action of actions) guarded = reducer(guarded, action)
    assert.equal(guarded.pawns[0].protectingId, 2)
    assert.deepEqual(chooseBotActions(guarded), [{ type: 'endTurn' }])
    state.pawns = state.pawns.filter((p) => p.kind !== 'ninja' && p.kind !== 'swordsman')
    state.pawns[1].q = -3
    state.pawns[1].r = -3
    const [move] = chooseBotActions(state, nearestTarget)
    assert.equal(move.type, 'move')
    const moved = reducer(state, move)
    assert.equal(moved.pawns[0].energy, 1)
    assert.equal(hexDist(state.pawns[0], moved.pawns[0]), 1)
    assert.deepEqual(chooseBotActions(moved), [{ type: 'endTurn' }])
  }
})
