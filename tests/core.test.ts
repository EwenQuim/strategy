import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activePawn,
  initialState,
  reducer,
  transition,
  reachable,
  distFrom,
  King,
  Swordsman,
  Magician,
  Archer,
  Ninja,
  type GameState,
  type Side,
  type Tile,
} from '../src/lib/engine/index.ts'
import { chooseBotActions, createBotGame } from '../src/lib/bot.ts'

function duel(side: Side): GameState {
  return {
    ...initialState('duel'),
    pawns: [
      new Swordsman(1, 0, 0, side),
      new King(2, -3, 0, side),
      new King(3, 2, 0, side === 'player' ? 'enemy' : 'player'),
    ],
    tiles: new Map([0, 1, 2, 3].map((q) => [q + ',0', { q, r: 0, terrain: 'plain' }])),
    order: [1, 3, 2],
    active: 0,
  }
}

test('Core initialization leaves both armies untouched and permits either side to start', () => {
  const sides = new Set<Side>()
  for (let index = 0; index < 30; index++) {
    const state = initialState('first-' + index)
    assert.deepEqual(state, initialState(state.seed))
    assert.equal(state.active, 0)
    assert.equal(state.round, 1)
    assert.equal(state.logCount, 1)
    assert.ok(state.pawns.every((p) => p.hp === p.maxHp && p.energy === p.maxEnergy))
    sides.add(activePawn(state)!.side)
  }
  assert.deepEqual(sides, new Set(['player', 'enemy']))
})

test('Both sides use the same actions; ending a turn never makes the opponent play', () => {
  for (const side of ['player', 'enemy'] as const) {
    const state = duel(side)
    const original = structuredClone(state)
    const moved = reducer(state, { type: 'move', q: 1, r: 0 })
    assert.equal(moved.pawns[0].energy, 2)
    const targeted = reducer(moved, { type: 'act', action: 'attack' })
    const struck = reducer(targeted, { type: 'attackAt', q: 2, r: 0 })
    assert.equal(struck.pawns[2].hp, 5)
    assert.equal(struck.pawns[0].energy, 1)
    const next = reducer(struck, { type: 'endTurn' })
    assert.equal(activePawn(next)?.id, 3)
    assert.equal(next.pawns[2].energy, 3)
    assert.equal(next.pawns[0].hp, 5)
    assert.equal(next.pawns[0].escapeChance, 20)
    assert.deepEqual(structuredClone(state), original)
    assert.deepEqual(reducer(next, { type: 'restart' }), initialState(state.seed))
  }
})

test('A final-energy kill wins for either side before advancing or resetting the round', () => {
  for (const side of ['player', 'enemy'] as const) {
    const state = duel(side)
    state.pawns[0].q = 1
    state.pawns[0].energy = 1
    state.pawns[2].hp = 1
    state.order = [2, 3, 1]
    state.active = 2
    state.phase = 'attack'
    const result = transition(state, { type: 'attackAt', q: 2, r: 0 })
    assert.equal(result.state.winner, side)
    assert.equal(result.state.phase, 'over')
    assert.equal(result.state.round, 1)
    assert.equal(result.frames.length, 1)
    assert.equal(result.frames[0].state.winner, null)
    assert.equal(activePawn(result.frames[0].state)?.id, 1)
    assert.deepEqual(result.frames[0].effect?.to, { q: 2, r: 0 })
    assert.equal(reducer(result.state, { type: 'endTurn' }), result.state)
    assert.equal(state.pawns[2].hp, 1)
  }
})

test('Single-action snapshots do not share mutable units, order, or logs with the result', () => {
  const result = transition(duel('player'), { type: 'move', q: 1, r: 0 })
  const frames = structuredClone(result.frames)
  result.state.pawns[0].hp--
  result.state.order.reverse()
  result.state.log.push('later')
  assert.deepEqual(structuredClone(result.frames), frames)
})

test('Core skips fallen units and refreshes a round without running a controller', () => {
  const state = duel('player')
  state.order = [1, 99, 3, 2]
  assert.equal(activePawn(reducer(state, { type: 'endTurn' }))?.id, 3)
  state.active = 3
  for (const pawn of state.pawns) {
    pawn.energy = 1
    pawn.escapeChance = 60
    pawn.specialUsed = true
  }
  const next = transition(state, { type: 'endTurn' })
  assert.equal(next.state.round, 2)
  assert.equal(next.state.active, 0)
  assert.ok(!next.state.order.includes(99))
  assert.ok(
    next.state.pawns.every(
      (p) => p.energy === p.maxEnergy && p.escapeChance === 0 && !p.specialUsed,
    ),
  )
  assert.ok(state.pawns.every((p) => p.energy === 1 && p.escapeChance === 60 && p.specialUsed))
})

test('The bot proposes ordinary actions for either side without mutating the rules state', () => {
  const sides = new Set<Side>()
  for (const seed of ['alpha', 'bravo', 'charlie']) {
    let state = initialState(seed)
    for (let turn = 0; turn < 200 && !state.winner; turn++) {
      sides.add(activePawn(state)!.side)
      const before = structuredClone(state)
      const actions = chooseBotActions(state)
      assert.ok(actions.length)
      assert.deepEqual(structuredClone(state), before)
      for (const action of actions) {
        const original = structuredClone(state)
        Object.freeze(state)
        Object.freeze(state.pawns)
        Object.freeze(state.order)
        Object.freeze(state.log)
        state.pawns.forEach(Object.freeze)
        for (const tile of state.tiles.values()) Object.freeze(tile)
        const result = transition(state, action)
        assert.notEqual(result.state, state)
        assert.deepEqual(result.state, reducer(state, action))
        assert.deepEqual(result, transition(state, action))
        assert.deepEqual(structuredClone(state), original)
        state = result.state
      }
    }
  }
  assert.deepEqual(sides, new Set(['player', 'enemy']))
})

test('Invalid bot strategies fail instead of spinning on rejected actions', () => {
  const game = createBotGame({ chooseTarget: () => new King(99, 99, 99, 'player') })
  const state = duel('player')
  const original = structuredClone(state)
  assert.throws(
    () => game.reducer(state, { type: 'endTurn' }),
    /Bot selected an invalid action/,
  )
  assert.deepEqual(structuredClone(state), original)
})

test('Path searches use shortest passable routes within the movement budget', () => {
  const tiles = new Map<string, Tile>([
    ['0,0', { q: 0, r: 0, terrain: 'plain' }],
    ['1,0', { q: 1, r: 0, terrain: 'mountain' }],
    ['2,0', { q: 2, r: 0, terrain: 'plain' }],
    ['0,1', { q: 0, r: 1, terrain: 'plain' }],
    ['1,1', { q: 1, r: 1, terrain: 'plain' }],
  ])
  const start = { q: 0, r: 0 }
  assert.equal(reachable(tiles, new Set(), start, 2).has('2,0'), false)
  assert.equal(reachable(tiles, new Set(), start, 3).get('2,0'), 3)
  assert.equal(reachable(tiles, new Set(['1,1']), start, 5).has('2,0'), false)
  assert.equal(distFrom(tiles, [{ q: 2, r: 0 }]).get('0,0'), 3)
})

test('Combat frames report actual hits and misses for either side without changing seeded results', () => {
  for (const side of ['player', 'enemy'] as const) {
    for (const Unit of [Swordsman, King, Archer, Magician, Ninja]) {
      for (const escapeChance of [0, 60]) {
        const state = duel(side)
        state.pawns[0] = new Unit(1, 0, 0, side)
        state.pawns[2].q = Unit === Archer ? 2 : 1
        state.pawns[2].escapeChance = escapeChance
        state.randomState = 0
        state.phase = 'attack'
        const action = { type: 'attackAt', q: state.pawns[2].q, r: 0 } as const
        const result = transition(state, action)
        const damage = escapeChance ? 0 : state.pawns[0].attack.damage
        assert.deepEqual(result.frames[0].effect?.impacts, [{ q: action.q, r: 0, damage }])
        assert.equal(result.state.pawns[2].hp, 7 - damage)
        assert.deepEqual(result.state, reducer(state, action))
        assert.deepEqual(result, transition(state, action))
        assert.equal(state.pawns[2].hp, 7)
        assert.deepEqual(transition(state, { type: 'attackAt', q: 99, r: 99 }).frames, [])
      }
    }
  }
})

test('Fireball reports each hit and dodge, including a killed target, without hitting allies', () => {
  const state = duel('player')
  state.pawns[0] = new Magician(1, 0, 0, 'player')
  state.pawns[2].q = 1
  state.pawns[2].escapeChance = 60
  state.pawns.push(new Archer(4, 2, 0, 'enemy', 1), new Archer(5, 1, 1, 'player'))
  state.randomState = 0
  state.phase = 'special'
  const result = transition(state, { type: 'specialAt', q: 1, r: 0 })
  assert.equal(result.frames[0].effect?.kind, 'fireball')
  assert.deepEqual(result.frames[0].effect?.impacts, [
    { q: 1, r: 0, damage: 0 },
    { q: 2, r: 0, damage: 1 },
  ])
  assert.ok(!result.state.pawns.some((p) => p.id === 4))
  assert.equal(result.state.pawns.find((p) => p.id === 5)?.hp, 3)
})

test('Player attack playback precedes enemy responses and shows lethal damage before victory', () => {
  const game = createBotGame()
  for (const lethal of [false, true]) {
    const state = duel('player')
    state.pawns[0].energy = 1
    state.pawns[2].q = 1
    state.pawns[2].hp = lethal ? 1 : 7
    state.phase = 'attack'
    const result = game.transition(state, { type: 'attackAt', q: 1, r: 0 })
    assert.equal(activePawn(result.frames[0].state)?.side, 'player')
    assert.equal(result.frames[0].state.winner, null)
    assert.deepEqual(result.frames[0].effect?.impacts, [{ q: 1, r: 0, damage: 2 }])
    if (lethal) {
      assert.equal(result.state.winner, 'player')
      assert.equal(result.frames.length, 1)
    } else {
      assert.equal(activePawn(result.frames[1].state)?.side, 'enemy')
      assert.ok(result.frames.slice(1).some((frame) => frame.effect?.impacts?.length))
    }
  }
})
