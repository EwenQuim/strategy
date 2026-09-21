import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  King,
  Archer,
  Magician,
  canAttack,
  chargeDestinations,
  targetingTiles,
  MAP_WIDTH,
  MAP_HEIGHT,
  hexOf,
  key,
  Swordsman,
  activePawn,
  createGameEngine,
  huntTheKing,
  initialState,
  nearestTarget,
  reducer,
  type GameState,
  type Tile,
} from '../src/lib/engine/index.ts'
import { SeededRandom, seedState } from '../src/lib/engine/random.ts'

function battle(): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  }
  return {
    seed: 'test',
    randomState: 0,
    tiles,
    pawns: [
      new Swordsman(1, 0, 0, 'player'),
      new King(2, -3, 0, 'player'),
      new King(3, 1, 0, 'enemy', undefined, 1),
    ],
    order: [1, 2, 3],
    active: 0,
    round: 1,
    phase: 'move',
    chargeDestination: null,
    winner: null,
    log: [],
    logCount: 0,
  }
}

test('Escape stacks by 20 points per energy, persists when the unit ends its turn, and clones pawns', () => {
  const original = battle()
  let state = original
  for (const expected of [20, 40, 60]) {
    state = reducer(state, { type: 'act', action: 'escape' })
    const unit = state.pawns.find((p) => p.id === 1)!
    assert.equal(unit.escapeChance, expected)
    assert.equal(unit.energy, 3 - expected / 20)
    assert.ok(unit instanceof Swordsman)
  }
  assert.equal(original.pawns[0].escapeChance, 0)
  assert.equal(original.pawns[0].energy, 3)
  assert.equal(state.round, 1)
  assert.equal(activePawn(state)?.id, 2)
})

test('Escape cannot exceed 60% or spend energy at the cap', () => {
  const state = battle()
  state.pawns[0].escapeChance = 60
  assert.equal(reducer(state, { type: 'act', action: 'escape' }), state)
  state.pawns[0].escapeChance = 50
  const next = reducer(state, { type: 'act', action: 'escape' })
  assert.equal(next.pawns[0].escapeChance, 60)
  assert.equal(next.pawns[0].energy, 2)
})

test('Escape is blocked during targeting, without energy, and after game over', () => {
  for (const state of [
    { ...battle(), phase: 'attack' as const },
    { ...battle(), winner: 'enemy' as const, phase: 'over' as const },
  ])
    assert.equal(reducer(state, { type: 'act', action: 'escape' }), state)
  const exhausted = battle()
  exhausted.pawns[0].energy = 0
  assert.equal(reducer(exhausted, { type: 'act', action: 'escape' }), exhausted)
})

for (const chance of [0, 20, 40, 60]) {
  test('Incoming attacks respect the ' + chance + '% Escape threshold', () => {
    for (let randomState = 0; randomState < 50; randomState++) {
      const random = new SeededRandom(randomState)
      const roll = random.next()
      const state = battle()
      state.randomState = randomState
      state.phase = 'attack'
      state.pawns[2].escapeChance = chance
      const next = reducer(state, { type: 'attackAt', q: 1, r: 0 })
      assert.equal(next.pawns[2].hp, roll * 100 < chance ? 7 : 5)
      assert.equal(next.pawns[0].energy, 2)
      assert.equal(next.randomState, chance > 0 ? random.state : randomState)
      assert.equal(state.pawns[2].hp, 7)
      assert.equal(state.randomState, randomState)
    }
  })
}

test('Enemy attacks use Escape too', () => {
  const state = battle()
  state.randomState = 7
  state.pawns[0].escapeChance = 20
  state.order = [1, 3, 2]
  const next = reducer(state, { type: 'endTurn' })
  assert.equal(next.pawns[0].hp, 5)
  assert.ok(next.log.some((line) => line.includes('escapes the attack')))
})

test('A new round restores energy and resets Escape for every unit', () => {
  const state = battle()
  state.order = [3, 2, 1]
  state.active = 2
  for (const pawn of state.pawns) {
    pawn.escapeChance = 60
    pawn.energy = 1
  }
  const next = reducer(state, { type: 'endTurn' })
  assert.equal(next.round, 2)
  assert.ok(next.pawns.every((p) => p.escapeChance === 0 && p.energy === p.maxEnergy))
  assert.ok(state.pawns.every((p) => p.escapeChance === 60 && p.energy === 1))
})

test('Targeting and cancelling are free; movement spends its path cost', () => {
  const state = battle()
  const attacking = reducer(state, { type: 'act', action: 'attack' })
  assert.equal(attacking.phase, 'attack')
  assert.equal(attacking.pawns[0].energy, 3)
  const cancelled = reducer(attacking, { type: 'cancelTargeting' })
  assert.equal(cancelled.phase, 'move')
  assert.equal(cancelled.pawns[0].energy, 3)
  assert.equal(reducer(state, { type: 'move', q: 0, r: 0 }), state)
  const moved = reducer(state, { type: 'move', q: 0, r: 2 })
  assert.equal(moved.pawns[0].energy, 1)
  assert.equal(moved.pawns[0].r, 2)
  assert.equal(state.pawns[0].r, 0)
})

test('Movement rejects mountains, occupied tiles, and out-of-range destinations', () => {
  const state = battle()
  state.tiles.set('0,1', { q: 0, r: 1, terrain: 'mountain' })
  for (const [q, r] of [
    [0, 1],
    [1, 0],
    [5, 0],
  ]) {
    assert.equal(reducer(state, { type: 'move', q, r }), state)
  }
})

test('Defeating the enemy king ends the game; restart clears the battle', () => {
  const state = battle()
  state.phase = 'attack'
  state.pawns[2].hp = 1
  const victory = reducer(state, { type: 'attackAt', q: 1, r: 0 })
  assert.equal(victory.winner, 'player')
  assert.equal(victory.phase, 'over')
  assert.equal(reducer(victory, { type: 'endTurn' }), victory)
  const restarted = reducer(victory, { type: 'restart' })
  assert.equal(restarted.winner, null)
  assert.equal(restarted.round, 1)
  assert.equal(restarted.pawns.length, 10)
  assert.ok(restarted.pawns.every((p) => p.escapeChance === 0))
  assert.equal(initialState('test').tiles.size, 99)
  assert.deepEqual(restarted, initialState(state.seed))
})

test('A lethal final enemy turn ends the current round without starting another', () => {
  const state = battle()
  state.pawns[0].q = -5
  state.pawns[1].q = 0
  state.pawns[1].hp = 1
  state.order = [2, 1, 3]
  state.active = 1
  const next = reducer(state, { type: 'endTurn' })
  assert.equal(next.winner, 'enemy')
  assert.equal(next.phase, 'over')
  assert.equal(next.round, 1)
  assert.ok(!next.log.some((line) => line.includes('Energy restored')))
})

test('Enemy targeting strategies are interchangeable without mutating candidates', () => {
  const attacker = new Swordsman(4, 0, 0, 'enemy')
  const guard = new Swordsman(1, 1, 0, 'player')
  const king = new King(2, 2, 0, 'player')
  const targets = Object.freeze([guard, king])
  assert.equal(nearestTarget.chooseTarget(attacker, targets), guard)
  assert.equal(huntTheKing.chooseTarget(attacker, targets), king)
  assert.equal(huntTheKing.chooseTarget(attacker, [guard]), guard)
  assert.equal(huntTheKing.chooseTarget(attacker, []), undefined)
})

test('The reducer uses the supplied enemy strategy', () => {
  const state = battle()
  state.pawns[1].q = 0
  state.pawns[1].r = 1
  state.order = [1, 3, 2]
  const nearest = createGameEngine(nearestTarget).reducer(state, { type: 'endTurn' })
  const hunting = createGameEngine(huntTheKing).reducer(state, { type: 'endTurn' })
  assert.equal(nearest.pawns[0].hp, 3)
  assert.equal(nearest.pawns[1].hp, 7)
  assert.equal(hunting.pawns[0].hp, 5)
  assert.equal(hunting.pawns[1].hp, 5)
})

test('Identical seeds and decisions replay identically, including repeated reducer calls', () => {
  let first = initialState('shared-vale')
  let replay = initialState('shared-vale')
  assert.deepEqual(first, replay)
  for (let turn = 0; turn < 60; turn++) {
    const action =
      turn % 3 === 2
        ? { type: 'endTurn' as const }
        : { type: 'act' as const, action: 'escape' as const }
    const next = reducer(first, action)
    assert.deepEqual(next, reducer(first, action))
    replay = reducer(replay, action)
    assert.deepEqual(next, replay)
    first = next
  }
  assert.deepEqual(reducer(first, { type: 'restart' }), initialState('shared-vale'))
})

test('Different seeds vary terrain and turn order without depending on global random state', (t) => {
  t.mock.method(Math, 'random', () => {
    throw new Error('Unseeded randomness')
  })
  const maps = new Set<string>()
  const orders = new Set(
    ['alpha', 'bravo', 'charlie', 'delta'].map((seed) => {
      const state = initialState(seed)
      assert.equal(state.seed, seed)
      maps.add(JSON.stringify([...state.tiles.values()]))
      const next = reducer(state, { type: 'endTurn' })
      assert.deepEqual(next, reducer(state, { type: 'endTurn' }))
      return state.order.join(',')
    }),
  )
  assert.ok(orders.size > 1)
  assert.ok(maps.size > 1)
})

test('Previewing, cancelling, and invalid actions never advance the random stream', () => {
  const state = battle()
  const attack = reducer(state, { type: 'act', action: 'attack' })
  assert.equal(attack.randomState, state.randomState)
  assert.equal(reducer(attack, { type: 'cancelTargeting' }).randomState, state.randomState)
  assert.equal(reducer(state, { type: 'move', q: 500, r: 500 }), state)
})

test('Seed hashing and the PRNG stream have a stable reference sequence', () => {
  assert.equal(seedState('hello'), 0x4f9f2cab)
  const random = new SeededRandom(1)
  assert.equal(random.next(), 0.6270739405881613)
  const resumed = new SeededRandom(random.state)
  assert.equal(random.next(), resumed.next())
})

test('The mobile board is 9 columns by 11 rows with passable spawn tiles', () => {
  assert.equal(MAP_WIDTH, 9)
  assert.equal(MAP_HEIGHT, 11)
  const state = initialState('mobile')
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 9; col++) {
      const { q, r } = hexOf(col, row)
      assert.ok(state.tiles.has(key(q, r)))
    }
  }
  for (const pawn of state.pawns) {
    const tile = state.tiles.get(key(pawn.q, pawn.r))
    assert.ok(tile && tile.terrain !== 'mountain')
  }
  assert.equal(new Set(state.pawns.map((p) => key(p.q, p.r))).size, state.pawns.length)
})

test('A confirmed attack spends exactly one energy, including the final energy before switching units', () => {
  for (const energy of [1, 2, 3]) {
    const state = battle()
    state.pawns[0].energy = energy
    const targeting = reducer(state, { type: 'act', action: 'attack' })
    assert.equal(targeting.pawns[0].energy, energy)
    const next = reducer(targeting, { type: 'attackAt', q: 1, r: 0 })
    assert.equal(next.pawns[0].energy, energy - 1)
    assert.equal(next.pawns[2].hp, 5)
    assert.equal(activePawn(next)?.id, energy === 1 ? 2 : 1)
    assert.equal(state.pawns[0].energy, energy)
  }
})

test('Notification IDs advance for repeated messages even when the log is full', () => {
  let state = battle()
  state.pawns[0].energy = 60
  for (let index = 1; index <= 45; index++) {
    state = reducer(state, { type: 'act', action: 'attack' })
    assert.equal(state.logCount, index - 1)
    state = reducer(state, { type: 'cancelTargeting' })
    state = reducer(state, { type: 'move', q: 0, r: index % 2 })
    assert.equal(state.logCount, index)
    assert.equal(state.log.length, Math.min(index, 40))
  }
  assert.equal(new Set(state.log).size, 1)
  state = reducer(state, { type: 'act', action: 'escape' })
  assert.equal(state.logCount, 46)
  state = reducer(state, { type: 'move', q: 0, r: 2 })
  assert.equal(state.logCount, 47)
  state.order = [1, 3, 2]
  state = reducer(state, { type: 'endTurn' })
  assert.equal(state.logCount, 48)
  assert.equal(state.log.length, 40)
})

test('Every class has its proposed health, damage, range, and independently cloned state', () => {
  for (const [Ctor, hp, damage, min, max] of [
    [King, 7, 2, 1, 1],
    [Swordsman, 5, 2, 1, 1],
    [Archer, 3, 1, 2, 3],
    [Magician, 3, 1, 1, 2],
  ] as const) {
    const pawn = new Ctor(1, 0, 0, 'player')
    assert.equal(pawn.hp, hp)
    assert.equal(pawn.maxHp, hp)
    assert.equal(pawn.attack.damage, damage)
    for (let distance = 0; distance <= 4; distance++) {
      assert.equal(
        canAttack(pawn, new King(2, distance, 0, 'enemy')),
        distance >= min && distance <= max,
      )
      assert.equal(canAttack(pawn, new King(2, distance, 0, 'player')), false)
    }
    pawn.specialUsed = true
    pawn.escapeChance = 40
    const clone = pawn.clone()
    assert.ok(clone instanceof Ctor)
    assert.deepEqual(clone, pawn)
    clone.hp--
    clone.specialUsed = false
    assert.equal(pawn.hp, hp)
    assert.equal(pawn.specialUsed, true)
  }
  const state = initialState('full-armies')
  for (const side of ['player', 'enemy']) {
    assert.deepEqual(
      state.pawns
        .filter((p) => p.side === side)
        .map((p) => p.kind)
        .sort(),
      ['archer', 'king', 'magician', 'swordsman', 'swordsman'],
    )
  }
})

test('Rally heals only a wounded adjacent ally, costs one energy, and resets next round', () => {
  const state = battle()
  state.pawns[0] = new King(1, 0, 0, 'player')
  state.pawns[1] = new Swordsman(2, 0, 1, 'player', 4)
  const preview = reducer(state, { type: 'act', action: 'special' })
  assert.deepEqual([...targetingTiles(preview)], ['0,1'])
  for (const [q, r] of [
    [0, 0],
    [1, 0],
    [0, 3],
  ])
    assert.equal(reducer(preview, { type: 'specialAt', q, r }), preview)
  const healed = reducer(preview, { type: 'specialAt', q: 0, r: 1 })
  assert.equal(healed.pawns[1].hp, 5)
  assert.equal(healed.pawns[0].energy, 2)
  assert.equal(healed.pawns[0].specialUsed, true)
  assert.equal(state.pawns[1].hp, 4)
  assert.equal(reducer(healed, { type: 'act', action: 'special' }), healed)
  healed.order = [3, 2, 1]
  healed.active = 2
  healed.pawns[2].q = 5
  healed.pawns[2].r = 5
  const nextRound = reducer(healed, { type: 'endTurn' })
  assert.equal(nextRound.round, 2)
  assert.equal(nextRound.pawns.find((p) => p.id === 1)!.specialUsed, false)
  const full = reducer(state, { type: 'act', action: 'special' })
  full.pawns[1].hp = 5
  assert.equal(targetingTiles(full).size, 0)
})

test('Charge previews freely, then moves and strikes atomically for two energy', () => {
  const state = battle()
  state.pawns[2].q = 3
  const preview = reducer(state, { type: 'act', action: 'special' })
  assert.ok(targetingTiles(preview).has('2,0'))
  const destination = reducer(preview, { type: 'specialAt', q: 2, r: 0 })
  assert.equal(destination.phase, 'charge')
  assert.equal(destination.pawns[0].q, 0)
  assert.equal(destination.pawns[0].energy, 3)
  assert.ok(targetingTiles(destination).has('3,0'))
  const cancelled = reducer(destination, { type: 'cancelTargeting' })
  assert.equal(cancelled.phase, 'move')
  assert.equal(cancelled.chargeDestination, null)
  assert.deepEqual(cancelled.pawns, state.pawns)
  const charged = reducer(destination, { type: 'specialAt', q: 3, r: 0 })
  assert.equal(charged.pawns[0].q, 2)
  assert.equal(charged.pawns[0].energy, 1)
  assert.equal(charged.pawns[2].hp, 5)
  assert.equal(charged.chargeDestination, null)
  assert.equal(state.pawns[0].q, 0)
  assert.equal(reducer(destination, { type: 'specialAt', q: -3, r: 0 }), destination)
})

test('Charge rejects blocked paths, occupied destinations, and insufficient energy', () => {
  const state = battle()
  state.pawns[2].q = 3
  for (const tile of state.tiles.values()) tile.terrain = 'mountain'
  for (const k of ['0,0', '2,0', '3,0']) state.tiles.get(k)!.terrain = 'plain'
  assert.equal(chargeDestinations(state.tiles, state.pawns, state.pawns[0]).size, 0)
  state.tiles.get('1,0')!.terrain = 'plain'
  assert.ok(chargeDestinations(state.tiles, state.pawns, state.pawns[0]).has('2,0'))
  state.pawns.push(new Swordsman(4, 1, 0, 'player'))
  assert.equal(chargeDestinations(state.tiles, state.pawns, state.pawns[0]).size, 0)
  state.pawns[0].energy = 1
  assert.equal(reducer(state, { type: 'act', action: 'special' }), state)
})

test('Aimed shot respects the archer dead zone and bypasses Escape without consuming randomness', () => {
  const state = battle()
  state.pawns[0] = new Archer(1, 0, 0, 'player')
  state.pawns[2].escapeChance = 60
  const adjacent = reducer(state, { type: 'act', action: 'special' })
  assert.equal(reducer(adjacent, { type: 'specialAt', q: 1, r: 0 }), adjacent)
  state.pawns[2].q = 2
  const preview = reducer(state, { type: 'act', action: 'special' })
  const shot = reducer(preview, { type: 'specialAt', q: 2, r: 0 })
  assert.equal(shot.pawns[2].hp, 5)
  assert.equal(shot.pawns[0].energy, 1)
  assert.equal(shot.randomState, state.randomState)
  assert.equal(state.pawns[2].hp, 7)
})

test('Fireball hits each nearby enemy once, spares allies, and handles multiple kills and victory', () => {
  const state = battle()
  state.pawns[0] = new Magician(1, 0, 0, 'player')
  state.pawns[2].hp = 1
  state.pawns.push(
    new Archer(4, 2, 0, 'enemy', 1),
    new Swordsman(5, 1, 1, 'enemy'),
    new Swordsman(6, 0, 1, 'player'),
    new Archer(7, 5, 5, 'enemy'),
  )
  const preview = reducer(state, { type: 'act', action: 'special' })
  const fired = reducer(preview, { type: 'specialAt', q: 1, r: 0 })
  assert.equal(fired.pawns[0].energy, 1)
  assert.deepEqual(
    fired.pawns.map((p) => p.id),
    [1, 2, 5, 6, 7],
  )
  assert.equal(fired.pawns.find((p) => p.id === 5)!.hp, 4)
  assert.equal(fired.pawns.find((p) => p.id === 6)!.hp, 5)
  assert.equal(fired.pawns.find((p) => p.id === 7)!.hp, 3)
  assert.equal(fired.winner, 'player')
  assert.equal(fired.phase, 'over')
  assert.deepEqual(fired, reducer(preview, { type: 'specialAt', q: 1, r: 0 }))
  assert.equal(state.pawns.length, 7)
})

test('Fireball Escape rolls share the seeded stream independently for every affected enemy', () => {
  const state = battle()
  state.pawns[0] = new Magician(1, 0, 0, 'player')
  state.pawns[2].escapeChance = 60
  state.pawns.push(new Archer(4, 2, 0, 'enemy', undefined, 3, 40))
  const random = new SeededRandom(state.randomState)
  const kingHp = random.next() < 0.6 ? 7 : 6
  const archerHp = random.next() < 0.4 ? 3 : 2
  const preview = reducer(state, { type: 'act', action: 'special' })
  const fired = reducer(preview, { type: 'specialAt', q: 1, r: 0 })
  assert.equal(fired.pawns[2].hp, kingHp)
  assert.equal(fired.pawns[3].hp, archerHp)
  assert.equal(fired.randomState, random.state)
})

test('Illegal attack targets do not spend energy or advance randomness', () => {
  const state = reducer(battle(), { type: 'act', action: 'attack' })
  for (const [q, r] of [
    [0, 0],
    [-3, 0],
    [0, 1],
    [99, 99],
  ])
    assert.equal(reducer(state, { type: 'attackAt', q, r }), state)
  state.pawns[2].q = 2
  assert.equal(reducer(state, { type: 'attackAt', q: 2, r: 0 }), state)
})

test('Enemy units spend the same full energy budget as the player', () => {
  const state = battle()
  state.pawns[2].energy = 3
  state.order = [1, 3, 2]
  const next = reducer(state, { type: 'endTurn' })
  assert.equal(
    next.pawns.some((p) => p.id === 1),
    false,
  )
  assert.equal(next.pawns.find((p) => p.id === 3)!.energy, 0)
  assert.equal(state.pawns[0].hp, 5)
})

test('Enemy archers retreat out of melee before shooting and can use Aimed shot', () => {
  const state = battle()
  state.pawns[2] = new Archer(3, 1, 0, 'enemy')
  state.pawns.push(new King(4, 5, 5, 'enemy'))
  state.order = [1, 3, 2, 4]
  const retreat = reducer(state, { type: 'endTurn' })
  assert.equal(retreat.pawns[0].hp, 3)
  assert.equal(retreat.pawns[2].energy, 0)
  assert.ok(canAttack(retreat.pawns[2], retreat.pawns[0]))
  state.pawns[2].q = 2
  state.pawns[2].energy = 2
  state.pawns[0].escapeChance = 60
  const aimed = reducer(state, { type: 'endTurn' })
  assert.equal(aimed.pawns[0].hp, 3)
  assert.equal(aimed.randomState, state.randomState)
  assert.ok(aimed.log.some((line) => line.includes('Aimed shot')))
})

test('Enemy kings Rally, swordsmen Charge, and magicians use Fireball', () => {
  const king = battle()
  king.order = [1, 3, 2]
  king.pawns.push(new Swordsman(4, 1, 1, 'enemy', 3))
  const rallied = reducer(king, { type: 'endTurn' })
  assert.equal(rallied.pawns[3].hp, 4)
  assert.equal(rallied.pawns[2].specialUsed, true)
  for (const Ctor of [Swordsman, Magician]) {
    const state = battle()
    state.pawns[2] = new Ctor(3, Ctor === Swordsman ? 3 : 2, 0, 'enemy', undefined, 2)
    state.pawns.push(new King(4, 5, 5, 'enemy'))
    state.order = [1, 3, 2, 4]
    if (Ctor === Magician) {
      state.pawns[1].q = 0
      state.pawns[1].r = 1
    }
    const next = reducer(state, { type: 'endTurn' })
    assert.equal(next.pawns[0].hp, Ctor === Swordsman ? 3 : 4)
    assert.equal(next.pawns[2].energy, 0)
    assert.ok(next.log.some((line) => line.includes(Ctor === Swordsman ? 'Charge' : 'Fireball')))
  }
})
