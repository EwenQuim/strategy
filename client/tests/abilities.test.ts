import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Bomber,
  Bulwark,
  King,
  Magician,
  Swordsman,
  RECRUIT_CLASSES,
  initialState,
  reducer,
  transition,
  targetingTiles,
  specialTargets,
  protectorFor,
  key,
  neighbors,
  type GameState,
  type Pawn,
  type Side,
} from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/engine/bot.ts'
import { nearestTarget } from '../src/lib/engine/bot.ts'
import { playbackReducer } from '../src/lib/playback.ts'

function battle(pawn: Pawn): GameState {
  const tiles: GameState['tiles'] = new Map()
  for (let q = -8; q <= 8; q++)
    for (let r = -8; r <= 8; r++) tiles.set(key(q, r), { q, r, terrain: 'plain' })
  return {
    ...initialState('ability-experiment'),
    tiles,
    pawns: [
      pawn,
      new King(2, -8, -8, pawn.side),
      new King(3, 8, 8, pawn.side === 'player' ? 'enemy' : 'player'),
    ],
    order: [1, 2, 3],
    active: 0,
  }
}

for (const side of ['player', 'enemy'] as const) {
  const other: Side = side === 'player' ? 'enemy' : 'player'
  test(
    side +
      ': Fireball traverses each of six rays through terrain and allies without splash or reverse damage',
    () => {
      for (const direction of neighbors(0, 0)) {
        const state = battle(new Magician(1, 0, 0, side))
        const { q, r } = direction
        state.pawns.push(
          new Swordsman(4, q * 2, r * 2, other),
          new Swordsman(5, q * 7, r * 7, other),
          new Swordsman(6, -q, -r, other),
          new Swordsman(7, q * 3, r * 3, side),
        )
        const offRay = neighbors(q * 2, r * 2).find((tile) => tile.q * r !== tile.r * q)!
        state.pawns.push(new Swordsman(8, offRay.q, offRay.r, other))
        state.tiles.get(key(q, r))!.terrain = 'mountain'
        state.tiles.get(key(q * 4, r * 4))!.terrain = 'lake'
        const original = structuredClone(state)
        const preview = reducer(state, { type: 'act', action: 'special' })
        assert.equal(targetingTiles(preview).size, 48)
        assert.ok(targetingTiles(preview).has(key(q * 7, r * 7)))
        assert.deepEqual(reducer(preview, { type: 'cancelTargeting' }), state)
        const result = transition(preview, { type: 'specialAt', q, r })
        assert.equal(result.state.pawns[0].energy, 1)
        assert.deepEqual(
          result.state.pawns.slice(3).map((pawn) => pawn.hp),
          [4, 4, 5, 5, 5],
        )
        assert.deepEqual(result.frames[0].effect?.to, { q: q * 8 || 0, r: r * 8 || 0 })
        assert.deepEqual(result.frames[0].effect?.impacts, [
          { q: q * 2, r: r * 2, damage: 1 },
          { q: q * 7, r: r * 7, damage: 1 },
        ])
        assert.deepEqual(result, transition(preview, { type: 'specialAt', q, r }))
        assert.deepEqual(structuredClone(state), original)
      }
    },
  )

  test(
    side +
      ': Bomb hits the center and all six neighbors, including from an empty or blocked center',
    () => {
      for (const occupied of [false, true]) {
        const state = battle(new Bomber(1, 0, 0, side))
        const center = { q: 2, r: 0 }
        const area = occupied ? [center, ...neighbors(2, 0)] : neighbors(2, 0)
        state.pawns.push(
          ...area.map((tile, index) => new Swordsman(4 + index, tile.q, tile.r, other)),
        )
        state.tiles.get('2,0')!.terrain = 'mountain'
        const preview = reducer(state, { type: 'act', action: 'special' })
        assert.equal(targetingTiles(preview).size, 19)
        const result = transition(preview, { type: 'specialAt', ...center })
        assert.equal(result.state.pawns[0].energy, 1)
        assert.ok(result.state.pawns.slice(3).every((pawn) => pawn.hp === 4))
        assert.equal(result.frames[0].effect?.impacts?.length, area.length)
        assert.ok(result.state.pawns.slice(0, 3).every((pawn) => pawn.hp === pawn.maxHp))
      }
    },
  )

  test(
    side +
      ': area specials can fire without enemies but reject invalid tiles and insufficient energy',
    () => {
      for (const Unit of [Magician, Bomber]) {
        const state = battle(new Unit(1, 0, 0, side))
        const preview = reducer(state, { type: 'act', action: 'special' })
        for (const tile of [
          { q: 99, r: 0 },
          Unit === Magician ? { q: 1, r: 1 } : { q: 3, r: 0 },
        ]) {
          assert.equal(transition(preview, { type: 'specialAt', ...tile }).state, preview)
        }
        const result = transition(preview, { type: 'specialAt', q: 0, r: -2 })
        assert.equal(result.state.pawns[0].energy, 1)
        assert.equal(result.state.randomState, state.randomState)
        assert.deepEqual(result.frames[0].effect?.impacts, [])
        assert.equal(reducer(result.state, { type: 'act', action: 'special' }), result.state)
        const exhausted = { ...preview, pawns: preview.pawns.map((pawn) => pawn.clone()) }
        exhausted.pawns[0].energy = 1
        assert.equal(reducer(exhausted, { type: 'specialAt', q: 0, r: -1 }), exhausted)
        assert.equal(targetingTiles(exhausted).size, 0)
      }
      const state = battle(new Bomber(1, 0, 0, side))
      const result = transition(reducer(state, { type: 'act', action: 'special' }), {
        type: 'specialAt',
        q: 0,
        r: 0,
      })
      assert.equal(result.state.pawns[0].hp, 2)
    },
  )

  test(
    side + ': Protect reaches two tiles, redirects a hit there, and rejects distance three',
    () => {
      const state = battle(new Bulwark(1, 0, 0, side))
      state.pawns[1] = new King(2, 2, 0, side)
      state.pawns.push(new Swordsman(4, 2, 1, other), new Swordsman(5, 3, 0, side))
      state.order = [1, 4, 2, 3, 5]
      assert.deepEqual(
        specialTargets(state.pawns, state.pawns[0]).map((pawn) => pawn.id),
        [2],
      )
      let next = reducer(reducer(state, { type: 'act', action: 'special' }), {
        type: 'specialAt',
        q: 2,
        r: 0,
      })
      assert.equal(protectorFor(next.pawns, next.pawns[1])?.id, 1)
      next = reducer(next, { type: 'endTurn' })
      next = reducer(reducer(next, { type: 'act', action: 'attack' }), {
        type: 'attackAt',
        q: 2,
        r: 0,
      })
      assert.equal(next.pawns[0].hp, 8)
      assert.equal(next.pawns[1].hp, 7)
      assert.equal(next.pawns[0].protectingId, null)
    },
  )
}

test('Bots use long-range rays and bombs centered on empty tiles', () => {
  for (const Unit of [Magician, Bomber]) {
    const state = battle(new Unit(1, 0, 0, 'player'))
    state.pawns[2] = new King(3, Unit === Magician ? 7 : 3, 0, 'enemy', 1)
    for (const level of ['easy', 'normal', 'hard', nearestTarget] as const) {
      const actions = chooseBotActions(state, level)
      const next = actions.reduce(reducer, state)
      assert.equal(next.winner, 'player')
    }
    for (const candidate of state.pawns[0].special.candidates(state.pawns[0], state)) {
      const result = candidate.reduce(reducer, state)
      assert.equal(result.pawns[0].energy, 1)
    }
  }
  assert.ok(RECRUIT_CLASSES.includes(Bomber))
  const state = initialState('bomber-roster', {
    biome: 'verdant',
    player: ['king', 'bomber'],
    enemy: ['king', 'bomber'],
  })
  assert.ok(
    state.pawns
      .filter((pawn) => pawn.kind === 'bomber')
      .every((pawn) => pawn instanceof Bomber),
  )
})

test('Bomb friendly fire hits allies, enemies and the caster, even if the caster dies first', () => {
  for (const side of ['player', 'enemy'] as const) {
    const other = side === 'player' ? 'enemy' : 'player'
    const state = battle(new Bomber(1, 0, 0, side, 1))
    state.pawns.push(new Swordsman(4, 1, 0, side), new Swordsman(5, 0, 1, other))
    const original = structuredClone(state)
    const preview = reducer(state, { type: 'act', action: 'special' })
    const result = transition(preview, { type: 'specialAt', q: 0, r: 0 })
    assert.equal(
      result.state.pawns.find((pawn) => pawn.id === 1),
      undefined,
    )
    assert.equal(result.state.pawns.find((pawn) => pawn.id === 4)?.hp, 4)
    assert.equal(result.state.pawns.find((pawn) => pawn.id === 5)?.hp, 4)
    assert.equal(result.frames[0].effect?.kind, 'bomb')
    assert.deepEqual(result.frames[0].effect?.impacts, [
      { q: 0, r: 0, damage: 1 },
      { q: 1, r: 0, damage: 1 },
      { q: 0, r: 1, damage: 1 },
    ])
    assert.deepEqual(structuredClone(state), original)
    assert.deepEqual(transition(preview, { type: 'specialAt', q: 0, r: 0 }), result)
  }
})

test('Bomb friendly fire respects Escape and killing your own king loses, including mutual king kills', () => {
  for (const side of ['player', 'enemy'] as const) {
    const state = battle(new Bomber(1, 0, 0, side))
    state.pawns[1].q = 1
    state.pawns[1].r = 0
    state.pawns[1].hp = 1
    state.pawns[1].escapeChance = 60
    state.randomState = 0
    const preview = reducer(state, { type: 'act', action: 'special' })
    const missed = transition(preview, { type: 'specialAt', q: 1, r: 0 })
    assert.equal(missed.state.pawns[1].hp, 1)
    assert.equal(missed.state.winner, null)
    assert.ok(
      missed.frames[0].effect?.impacts?.some(
        (hit) => hit.q === 1 && hit.r === 0 && hit.damage === 0,
      ),
    )
    state.pawns[1].escapeChance = 0
    for (const mutual of [false, true]) {
      if (mutual) {
        state.pawns[2].q = 2
        state.pawns[2].r = 0
        state.pawns[2].hp = 1
      }
      const fired = reducer(reducer(state, { type: 'act', action: 'special' }), {
        type: 'specialAt',
        q: 1,
        r: 0,
      })
      assert.equal(fired.winner, side === 'player' ? 'enemy' : 'player')
    }
  }
})

test('Empty bombs keep a visible playback frame in local, online and AI games', () => {
  const state = battle(new Bomber(1, 0, 0, 'player'))
  for (const mode of ['local', 'online', 'ai'] as const) {
    const preview = playbackReducer(
      { state, frames: [] },
      { type: 'act', action: 'special' },
      mode,
    )
    const result = playbackReducer(preview, { type: 'specialAt', q: 2, r: 0 }, mode)
    assert.equal(result.frames.length, 1)
    assert.equal(result.frames[0].effect?.kind, 'bomb')
    assert.deepEqual(result.frames[0].effect?.to, { q: 2, r: 0 })
    assert.deepEqual(result.frames[0].effect?.impacts, [])
    assert.equal(playbackReducer(result, { type: 'endTurn' }, mode), result)
    assert.equal(playbackReducer(result, { type: 'playbackNext' }, mode).frames.length, 0)
  }
})

test('Bots avoid bombing their own king and do not target ally-only groups', () => {
  const state = battle(new Bomber(1, 0, 0, 'player'))
  state.pawns[1] = new King(2, 2, 0, 'player', 1)
  state.pawns[2] = new King(3, 3, 0, 'enemy', 1)
  for (const strategy of ['easy', 'normal', 'hard', nearestTarget] as const) {
    const next = chooseBotActions(state, strategy).reduce(reducer, state)
    assert.equal(next.pawns.find((pawn) => pawn.id === 2)?.hp, 1)
    assert.notEqual(next.winner, 'enemy')
  }
  state.pawns[2].q = 8
  state.pawns[2].r = 8
  assert.deepEqual(state.pawns[0].special.candidates(state.pawns[0], state), [])
})

test('Area threat estimates respect alignment, reach, and energy', () => {
  const target = new King(3, 7, 0, 'enemy')
  for (const Unit of [Magician, Bomber]) {
    const pawn = new Unit(1, 0, 0, 'player')
    const position = { target, targets: [target], from: pawn, movementCost: 0 }
    assert.equal(pawn.special.threat!(pawn, position), Unit === Magician ? 1 : 0)
    target.q = 3
    assert.equal(pawn.special.threat!(pawn, position), 1)
    assert.equal(pawn.special.threat!(pawn, { ...position, movementCost: 2 }), 0)
    target.q = 7
  }
})
