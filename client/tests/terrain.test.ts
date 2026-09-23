import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Archer,
  Bulwark,
  King,
  Magician,
  Ninja,
  Swordsman,
  BIOMES,
  activePawn,
  canAttack,
  initialState,
  key,
  makeMap,
  mapFromRows,
  movementDestinations,
  passable,
  reducer,
  targetingTiles,
  transition,
  walkingPaths,
  type Biome,
  type GameState,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'
import { SeededRandom, seedState } from '../src/lib/engine/random.ts'
import { chooseBotActions, createBotGame } from '../src/lib/bot.ts'
import { nearestTarget } from '../src/lib/strategies.ts'
import { playbackReducer } from '../src/lib/playback.ts'

function battle(pawn: Pawn): GameState {
  const other = pawn.side === 'player' ? 'enemy' : 'player'
  const tiles = new Map<string, Tile>()
  for (let q = -4; q <= 8; q++)
    for (let r = 0; r < 12; r++) tiles.set(key(q, r), { q, r, terrain: 'plain' })
  return {
    ...initialState('terrain-test'),
    tiles,
    pawns: [pawn, new King(2, -3, 0, pawn.side), new King(3, 5, 11, other)],
    order: [1, 2, 3],
    active: 0,
  }
}

function nextActivation(state: GameState): GameState {
  const id = activePawn(state)!.id
  do {
    state = reducer(state, { type: 'endTurn' })
  } while (activePawn(state)?.id !== id)
  return state
}

function corridor(pawn: Pawn): GameState {
  const state = battle(pawn)
  state.tiles = new Map(
    Array.from({ length: 5 }, (_, q) => [key(q, 5), { q, r: 5, terrain: 'plain' }]),
  )
  state.tiles.get('1,5')!.terrain = 'lava'
  state.tiles.get('2,5')!.terrain = 'lava'
  return state
}

test('Random special tiles follow 50/40/10 odds, are distinct, and stay in the center', () => {
  const counts = [0, 0, 0]
  const kinds = new Set<string>()
  for (let index = 0; index < 4000; index++) {
    const state = initialState('features-' + index)
    const features = [...state.tiles.values()].filter((tile) => tile.feature)
    assert.ok(features.length <= 2)
    counts[features.length]++
    assert.equal(new Set(features.map((tile) => tile.feature)).size, features.length)
    for (const tile of features) {
      kinds.add(tile.feature!)
      assert.ok(tile.r === 5 || tile.r === 6)
      assert.ok(passable(tile))
      assert.notEqual(tile.terrain, 'lava')
      assert.ok(!state.pawns.some((pawn) => pawn.q === tile.q && pawn.r === tile.r))
    }
    if (index < 20) assert.deepEqual(initialState(state.seed), state)
  }
  for (const [count, expected] of [0.5, 0.4, 0.1].entries())
    assert.ok(Math.abs(counts[count] / 4000 - expected) < 0.03, counts.join(','))
  assert.deepEqual(kinds, new Set(['watchtower', 'spring', 'rune']))
})

test('Deserts have small lakes and rare decorative palms; volcanoes have passable lava pools', () => {
  let palms = 0
  for (const biome of Object.keys(BIOMES) as Biome[]) {
    for (let index = 0; index < 100; index++) {
      const tiles = makeMap(new SeededRandom(seedState('decor-' + index)), biome)
      const all = [...tiles.values()]
      assert.equal(
        all.some((tile) => tile.terrain === 'lava'),
        biome === 'volcano',
      )
      assert.equal(
        all.some((tile) => tile.terrain === 'lake'),
        biome === 'desert' || biome === 'verdant',
      )
      for (const tile of all.filter((tile) => tile.terrain === 'palm')) {
        assert.equal(biome, 'desert')
        assert.ok(passable(tile))
        palms++
      }
    }
  }
  assert.ok(palms > 100 && palms < 600, 'Palms should be rare, not a forest: ' + palms)
  const state = battle(new Swordsman(1, 0, 5, 'player'))
  state.tiles.get('1,5')!.terrain = 'palm'
  const moved = reducer(state, { type: 'move', q: 1, r: 5 })
  assert.equal(moved.pawns[0].hp, 5)
  assert.equal(moved.pawns[0].energy, 2)
  assert.deepEqual(moved.log, state.log)
})

test('Authored maps support new terrain and reject special tiles outside the center or above the cap', () => {
  const rows = ['pbl.....', ...Array<string>(11).fill('........')]
  rows[5] = 'W.......'
  rows[6] = 'H.......'
  const tiles = mapFromRows(rows)
  assert.deepEqual(
    [...tiles.values()].slice(0, 3).map((tile) => tile.terrain),
    ['palm', 'basalt', 'lava'],
  )
  assert.deepEqual(
    [...tiles.values()].filter((tile) => tile.feature).map((tile) => tile.feature),
    ['watchtower', 'spring'],
  )
  rows[5] = 'R.......'
  assert.equal([...mapFromRows(rows).values()].find((tile) => tile.feature)?.feature, 'rune')
  rows[5] = 'RW......'
  assert.throws(() => mapFromRows(rows), /two tiles/)
  rows[5] = '........'
  rows[0] = 'R.......'
  assert.throws(() => mapFromRows(rows), /center/)
})

for (const side of ['player', 'enemy'] as const) {
  test(side + ': watchtowers extend basic ranged attacks only while occupied', () => {
    for (const Unit of [Archer, Magician, Swordsman, King, Ninja, Bulwark]) {
      const state = battle(new Unit(1, 0, 5, side))
      const pawn = state.pawns[0]
      state.tiles.get('0,5')!.feature = 'watchtower'
      state.pawns[2].q = pawn.attack.maxRange + 1
      state.pawns[2].r = 5
      const target = state.pawns[2]
      const ranged = Unit === Archer || Unit === Magician
      const attack = reducer(state, { type: 'act', action: 'attack' })
      assert.equal(targetingTiles(attack).has(key(target.q, target.r)), ranged)
      assert.equal(canAttack(pawn, target, state.tiles.get('0,5')), ranged)
      const result = reducer(attack, { type: 'attackAt', q: target.q, r: target.r })
      assert.equal(result.pawns[2].hp, target.hp - (ranged ? pawn.attack.damage : 0))
      if (ranged) {
        const special = reducer(state, { type: 'act', action: 'special' })
        assert.equal(targetingTiles(special).has(key(target.q, target.r)), Unit === Magician)
        const plain = { ...state, tiles: new Map(state.tiles) }
        plain.tiles.set('0,5', { q: 0, r: 5, terrain: 'plain' })
        assert.deepEqual(
          targetingTiles(special),
          targetingTiles(reducer(plain, { type: 'act', action: 'special' })),
        )
        const cast = reducer(special, { type: 'specialAt', q: target.q, r: target.r })
        if (Unit === Magician) assert.equal(cast.pawns[2].hp, target.hp - 1)
        else assert.equal(cast, special)
        const moved = reducer(state, { type: 'move', q: -1, r: 5 })
        assert.ok(!canAttack(moved.pawns[0], target, moved.tiles.get('-1,5')))
      }
      if (Unit === Archer) {
        target.q = 1
        assert.ok(!canAttack(pawn, target, state.tiles.get('0,5')))
      }
    }
  })

  test(
    side + ': a spring heals after staying, never on arrival, and respects maximum health',
    () => {
      const state = battle(new Swordsman(1, 0, 5, side, 2))
      state.tiles.get('1,5')!.feature = 'spring'
      const original = structuredClone(state)
      let next = reducer(state, { type: 'move', q: 1, r: 5 })
      assert.equal(next.pawns[0].hp, 2)
      next = nextActivation(next)
      assert.equal(next.pawns[0].hp, 3)
      assert.equal(next.logCount, next.log.length)
      const targeting = reducer(next, { type: 'act', action: 'attack' })
      assert.equal(reducer(targeting, { type: 'cancelTargeting' }).pawns[0].hp, 3)
      next = nextActivation(next)
      assert.equal(next.pawns[0].hp, 4)
      next = nextActivation(nextActivation(next))
      assert.equal(next.pawns[0].hp, 5)
      const left = reducer(reducer(state, { type: 'move', q: 1, r: 5 }), {
        type: 'move',
        q: 0,
        r: 5,
      })
      assert.equal(nextActivation(left).pawns[0].hp, 2)
      assert.deepEqual(structuredClone(state), original)
    },
  )

  test(
    side +
      ': runes grant exactly two temporary energy, disappear, and do not mutate prior states',
    () => {
      const state = battle(new Archer(1, 0, 5, side))
      state.tiles.get('1,5')!.feature = 'rune'
      Object.freeze(state.tiles.get('1,5'))
      const original = structuredClone(state)
      const result = transition(state, { type: 'move', q: 1, r: 5 })
      let next = result.state
      assert.equal(next.pawns[0].energy, 4)
      assert.equal(next.pawns[0].maxEnergy, 5)
      assert.equal(activePawn(next)?.id, 1)
      assert.equal(next.tiles.get('1,5')!.feature, undefined)
      assert.deepEqual(structuredClone(state), original)
      next = reducer(reducer(next, { type: 'move', q: 0, r: 5 }), { type: 'move', q: 1, r: 5 })
      assert.equal(next.pawns[0].energy, 2)
      next = nextActivation(next)
      assert.equal(next.pawns[0].energy, 3)
      assert.equal(next.pawns[0].maxEnergy, 3)
      assert.equal(next.pawns[0].bonusEnergy, 0)
      assert.equal(result.frames[0].state.pawns[0].energy, 4)
    },
  )

  test(
    side +
      ': lava damages every entered tile, bypasses Escape and Protect, and stops lethal crossings',
    () => {
      const state = corridor(new Swordsman(1, 0, 5, side, 5, 3, 60))
      const guard = new Bulwark(4, 0, 6, side)
      guard.protectingId = 1
      state.pawns.push(guard)
      const result = transition(state, { type: 'move', q: 2, r: 5 })
      assert.equal(result.state.pawns[0].hp, 3)
      assert.equal(result.state.pawns[0].energy, 1)
      assert.equal(result.state.pawns[3].hp, 10)
      assert.equal(result.state.randomState, state.randomState)
      assert.equal(state.pawns[0].hp, 5)
      assert.deepEqual(result.frames[0].effect?.impacts, [
        { q: 1, r: 5, damage: 1 },
        { q: 2, r: 5, damage: 1 },
      ])
      const waiting = nextActivation(result.state)
      assert.equal(waiting.pawns[0].hp, 3)
      const lethal = corridor(new Ninja(1, 0, 5, side))
      assert.ok(movementDestinations(lethal.tiles, lethal.pawns, lethal.pawns[0]).has('1,5'))
      assert.ok(!movementDestinations(lethal.tiles, lethal.pawns, lethal.pawns[0]).has('2,5'))
      const dead = transition(lethal, { type: 'move', q: 1, r: 5 })
      assert.ok(!dead.state.pawns.some((pawn) => pawn.id === 1))
      assert.equal(activePawn(dead.state)?.id, 2)
      assert.equal(activePawn(dead.frames[0].state)?.hp, 0)
      const locked = { state: lethal, frames: [] }
      const playback = playbackReducer(locked, { type: 'move', q: 1, r: 5 }, 'local')
      assert.ok(playback.frames.length)
      assert.equal(playbackReducer(playback, { type: 'endTurn' }, 'local'), playback)
    },
  )

  test(side + ': a king dying on lava immediately loses without starting a new round', () => {
    const state = corridor(new King(1, 0, 5, side, 1))
    state.pawns = state.pawns.filter((pawn) => pawn.id !== 2)
    state.order = [3, 1]
    state.active = 1
    const result = transition(state, { type: 'move', q: 1, r: 5 })
    assert.equal(result.state.winner, side === 'player' ? 'enemy' : 'player')
    assert.equal(result.state.phase, 'over')
    assert.equal(result.state.round, 1)
    assert.equal(result.frames[0].state.winner, null)
  })
}

test('Walking prefers a safe equal-length path and can take a longer route around lethal lava', () => {
  for (const hp of [1, 3]) {
    const state = battle(new Swordsman(1, 0, 5, 'player', hp))
    state.tiles.get('1,5')!.terrain = 'lava'
    const route = walkingPaths(state.tiles, state.pawns, state.pawns[0]).get('1,6')!
    assert.equal(route.damage, 0)
    assert.equal(route.path.length, 2)
    const next = reducer(state, { type: 'move', q: 1, r: 6 })
    assert.equal(next.pawns[0].hp, hp)
    if (hp === 1) {
      const around = walkingPaths(state.tiles, state.pawns, state.pawns[0]).get('2,5')!
      assert.equal(around.damage, 0)
      assert.equal(around.path.length, 3)
    }
  }
})

test('Charge triggers crossed runes and lava before striking; a lethal charge cannot attack', () => {
  for (const hp of [1, 5]) {
    const state = corridor(new Swordsman(1, 0, 5, 'player', hp))
    state.tiles.get('1,5')!.terrain = 'plain'
    state.tiles.get('1,5')!.feature = 'rune'
    state.pawns[2].q = 3
    state.pawns[2].r = 5
    let next = reducer(state, { type: 'act', action: 'special' })
    next = reducer(next, { type: 'specialAt', q: 2, r: 5 })
    next = reducer(next, { type: 'specialAt', q: 3, r: 5 })
    assert.equal(next.pawns.find((pawn) => pawn.id === 3)!.hp, hp === 1 ? 7 : 5)
    assert.equal(next.tiles.get('1,5')!.feature, undefined)
    const actor = next.pawns.find((pawn) => pawn.id === 1)
    if (hp === 1) assert.equal(actor, undefined)
    else {
      assert.equal(actor!.hp, 4)
      assert.equal(actor!.energy, 3)
    }
  }
})

test('Jump ignores crossed lava and runes but triggers its landing tile', () => {
  const state = corridor(new Ninja(1, 0, 5, 'player'))
  state.tiles.get('2,5')!.terrain = 'plain'
  state.tiles.get('2,5')!.feature = 'rune'
  const targeting = reducer(state, { type: 'act', action: 'special' })
  const crossed = reducer(targeting, { type: 'specialAt', q: 3, r: 5 })
  assert.equal(crossed.pawns[0].hp, 1)
  assert.equal(crossed.pawns[0].energy, 1)
  assert.equal(crossed.tiles.get('2,5')!.feature, 'rune')
  const collected = reducer(targeting, { type: 'specialAt', q: 2, r: 5 })
  assert.equal(collected.pawns[0].energy, 3)
  assert.equal(collected.tiles.get('2,5')!.feature, undefined)
  const lethal = reducer(targeting, { type: 'specialAt', q: 1, r: 5 })
  assert.ok(!lethal.pawns.some((pawn) => pawn.id === 1))
  assert.equal(activePawn(lethal)?.id, 2)
})

test('Bots can use tower range and evaluate lethal lava moves without crashing or choosing suicide', () => {
  for (const strategy of ['easy', 'normal', 'hard', nearestTarget] as const) {
    const state = battle(new Archer(1, 0, 5, 'enemy', 3, 1))
    state.tiles.get('0,5')!.feature = 'watchtower'
    state.pawns[2].q = 4
    state.pawns[2].r = 5
    state.pawns[2].hp = 1
    assert.equal(chooseBotActions(state, strategy).reduce(reducer, state).winner, 'enemy')
    const lava = corridor(new Ninja(1, 0, 5, 'enemy'))
    const next = chooseBotActions(lava, strategy).reduce(reducer, lava)
    assert.ok(next.pawns.some((pawn) => pawn.id === 1))
  }
})

test('Authored features and consumed runes restore on restart in both controllers', () => {
  const map = Array<string>(12).fill('........')
  map[5] = 'HR......'
  const setup = {
    biome: 'volcano' as const,
    map,
    player: [{ kind: 'king' as const, col: 0, row: 5 }],
    enemy: [{ kind: 'king' as const, col: 7, row: 11 }],
  }
  for (const game of [{ initialState, reducer }, createBotGame()]) {
    const state = game.initialState('restart-features', setup)
    state.order = [1, 2]
    state.active = 0
    const next = game.reducer(state, { type: 'move', q: -1, r: 5 })
    assert.equal(next.pawns[0].bonusEnergy, 2)
    assert.equal(next.tiles.get('-1,5')!.feature, undefined)
    assert.deepEqual(
      game.reducer(next, { type: 'restart' }),
      game.initialState(state.seed, setup),
    )
  }
})
