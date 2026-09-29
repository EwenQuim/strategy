import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BIOMES,
  King,
  Archer,
  Magician,
  Bomber,
  Ninja,
  Bulwark,
  RECRUIT_CLASSES,
  jumpDestinations,
  hexDist,
  canAttack,
  chargeDestinations,
  targetingTiles,
  MAP_WIDTH,
  MAP_HEIGHT,
  hexOf,
  key,
  Swordsman,
  activePawn,
  type GameState,
  type Tile,
  reducer as coreReducer,
} from '../src/lib/engine/index.ts'
import { createBotGame } from '../src/lib/engine/bot.ts'
import { huntTheKing, nearestTarget } from '../src/lib/engine/bot.ts'
import { playbackReducer } from '../src/lib/playback.ts'
import { SeededRandom, seedState } from '../src/lib/engine/random.ts'

const { initialState, initialTransition, transition, reducer } = createBotGame(nearestTarget)

function battle(): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  }
  return {
    seed: 'test',
    biome: 'verdant',
    hellfire: [],
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
    lastClashRound: 0,
    winner: null,
    log: [],
    logCount: 0,
  }
}

test('The last clash round follows combat damage, not plain moves', () => {
  const state = battle()
  assert.equal(coreReducer(state, { type: 'move', q: 0, r: -1 }).lastClashRound, 0)
  assert.equal(coreReducer(state, { type: 'attack', q: 1, r: 0 }).lastClashRound, state.round)
})

test('End turn converts all remaining energy to Escape for every class and advances once', () => {
  for (const Ctor of [King, ...RECRUIT_CLASSES]) {
    for (const energy of [0, 1, 2, 3]) {
      const state = battle()
      state.pawns[0] = new Ctor(1, 0, 0, 'player', undefined, energy)
      assert.equal(state.pawns[0].endTurnEscapeChance, energy * 20)
      const next = reducer(state, { type: 'endTurn' })
      assert.equal(next.pawns[0].escapeChance, energy * 20)
      assert.equal(next.pawns[0].energy, 0)
      assert.equal(activePawn(next)?.id, 2)
      assert.equal(next.round, 1)
      assert.equal(next.logCount, energy > 0 ? 1 : 0)
      assert.ok(next.pawns[0] instanceof Ctor)
      assert.equal(state.pawns[0].energy, energy)
      assert.equal(state.pawns[0].escapeChance, 0)
      assert.equal(next.randomState, state.randomState)
    }
  }
})

test('End turn caps Escape at 60% but always consumes energy and passes to the next unit', () => {
  for (const chance of [20, 40, 50, 60]) {
    const state = battle()
    state.pawns[0].escapeChance = chance
    const next = reducer(state, { type: 'endTurn' })
    assert.equal(next.pawns[0].escapeChance, 60)
    assert.equal(next.pawns[0].energy, 0)
    assert.equal(activePawn(next)?.id, 2)
    assert.equal(next.logCount, chance < 60 ? 1 : 0)
  }
})

test('End turn cannot act for an enemy or after game over', () => {
  const over = { ...battle(), winner: 'enemy' as const }
  assert.equal(reducer(over, { type: 'endTurn' }), over)
  const enemy = { ...battle(), active: 2 }
  assert.equal(reducer(enemy, { type: 'endTurn' }), enemy)
})

test('End-turn Escape protects the outgoing unit before the enemy attacks', () => {
  for (const energy of [1, 2, 3]) {
    for (let randomState = 0; randomState < 20; randomState++) {
      const state = battle()
      state.order = [1, 3, 2]
      state.pawns[0].energy = energy
      state.randomState = randomState
      const random = new SeededRandom(randomState)
      const escaped = random.next() * 100 < energy * 20
      const next = reducer(state, { type: 'endTurn' })
      assert.equal(next.pawns[0].hp, escaped ? 5 : 3)
      assert.equal(next.pawns[0].escapeChance, energy * 20)
      assert.equal(next.randomState, random.state)
      assert.equal(next.pawns[0].energy, 0)
    }
  }
})

test('Pawn classes can extend turn-end behavior and the UI preview uses the same rule', () => {
  class CautiousSwordsman extends Swordsman {
    override get endTurnEscapeChance(): number {
      return Math.min(super.endTurnEscapeChance, 40)
    }
    override endTurn(): void {
      super.endTurn()
      this.hp = Math.min(this.maxHp, this.hp + 1)
    }
  }
  const state = battle()
  state.pawns[0] = new CautiousSwordsman(1, 0, 0, 'player', 3)
  assert.equal(state.pawns[0].endTurnEscapeChance, 40)
  const next = reducer(state, { type: 'endTurn' })
  assert.equal(next.pawns[0].escapeChance, 40)
  assert.equal(next.pawns[0].hp, 4)
  assert.equal(next.pawns[0].energy, 0)
  assert.equal(state.pawns[0].hp, 3)

  state.pawns[0].energy = 1
  const exhausted = reducer(state, { type: 'move', q: 0, r: 1 })
  assert.equal(exhausted.pawns[0].hp, 4)
  assert.equal(exhausted.pawns[0].escapeChance, 0)
  assert.equal(activePawn(exhausted)?.id, 2)

  state.order = [1, 4, 2, 3]
  state.pawns.push(new CautiousSwordsman(4, 5, 5, 'enemy', 3))
  for (const tile of state.tiles.values()) tile.terrain = 'mountain'
  const enemy = reducer(state, { type: 'endTurn' }).pawns.find((p) => p.id === 4)!
  assert.equal(enemy.escapeChance, 40)
  assert.equal(enemy.energy, 0)
  assert.equal(enemy.hp, 4)
})

for (const chance of [0, 20, 40, 60]) {
  test('Incoming attacks respect the ' + chance + '% Escape threshold', () => {
    for (let randomState = 0; randomState < 50; randomState++) {
      const random = new SeededRandom(randomState)
      const roll = random.next()
      const state = battle()
      state.randomState = randomState
      state.pawns[2].escapeChance = chance
      const next = reducer(state, { type: 'attack', q: 1, r: 0 })
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
  state.pawns[0].energy = 0
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
  const next = coreReducer(state, { type: 'endTurn' })
  assert.equal(next.round, 2)
  assert.ok(next.pawns.every((p) => p.escapeChance === 0 && p.energy === p.maxEnergy))
  assert.ok(state.pawns.every((p) => p.escapeChance === 60 && p.energy === 1))
})

test('Movement spends its path cost', () => {
  const state = battle()
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
  state.pawns[2].hp = 1
  const victory = reducer(state, { type: 'attack', q: 1, r: 0 })
  assert.equal(victory.winner, 'player')
  assert.equal(reducer(victory, { type: 'endTurn' }), victory)
  const restarted = reducer(victory, { type: 'restart' })
  assert.equal(restarted.winner, null)
  assert.equal(restarted.round, 1)
  assert.equal(restarted.pawns.length, 12)
  assert.ok(restarted.pawns.every((p) => p.escapeChance === 0))
  assert.equal(initialState('test').tiles.size, MAP_WIDTH * MAP_HEIGHT)
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
  state.pawns[0].energy = 0
  state.pawns[1].q = 0
  state.pawns[1].r = 1
  state.order = [1, 3, 2]
  const nearest = createBotGame(nearestTarget).reducer(state, { type: 'endTurn' })
  const hunting = createBotGame(huntTheKing).reducer(state, { type: 'endTurn' })
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
    const action = { type: 'endTurn' as const }
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
      return state.order.map((id) => state.pawns.findIndex((pawn) => pawn.id === id)).join(',')
    }),
  )
  assert.ok(orders.size > 1)
  assert.ok(maps.size > 1)
})

test('Invalid actions never advance the random stream', () => {
  const state = battle()
  assert.equal(reducer(state, { type: 'move', q: 500, r: 500 }), state)
})

test('Seed hashing and the PRNG stream have a stable reference sequence', () => {
  assert.equal(seedState('hello'), 0x4f9f2cab)
  const random = new SeededRandom(1)
  assert.equal(random.next(), 0.6270739405881613)
  const resumed = new SeededRandom(random.state)
  assert.equal(random.next(), resumed.next())
})

test('The mobile board is 8 columns by 12 rows with passable spawn tiles', () => {
  assert.equal(MAP_WIDTH, 8)
  assert.equal(MAP_HEIGHT, 12)
  const state = initialState('mobile')
  for (let row = 0; row < MAP_HEIGHT; row++) {
    for (let col = 0; col < MAP_WIDTH; col++) {
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
    const next = reducer(state, { type: 'attack', q: 1, r: 0 })
    assert.equal(next.pawns[0].energy, energy - 1)
    assert.equal(next.pawns[2].hp, 5)
    assert.equal(activePawn(next)?.id, energy === 1 ? 2 : 1)
    assert.equal(state.pawns[0].energy, energy)
  }
})

test('Notification IDs advance for repeated attacks even when the log is full', () => {
  let state = battle()
  state.pawns[0].energy = 60
  state.pawns[2].hp = 200
  for (let index = 1; index <= 45; index++) {
    assert.equal(state.logCount, index - 1)
    state = reducer(state, { type: 'attack', q: 1, r: 0 })
    assert.equal(state.logCount, index)
    assert.equal(state.log.length, Math.min(index, 40))
  }
  assert.equal(new Set(state.log).size, 1)
  state.order = [1, 3, 2]
  state = reducer(state, { type: 'endTurn' })
  assert.equal(state.logCount, 47)
  assert.equal(state.log.length, 40)
})

test('Every class has its proposed health, damage, range, and independently cloned state', () => {
  for (const [Ctor, hp, damage, min, max] of [
    [King, 7, 2, 1, 1],
    [Swordsman, 5, 2, 1, 1],
    [Archer, 3, 1, 2, 3],
    [Magician, 3, 1, 1, 2],
    [Bomber, 3, 1, 1, 2],
    [Ninja, 1, 5, 1, 1],
    [Bulwark, 10, 1, 1, 1],
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
})

test('Rally immediately heals every wounded adjacent ally for one energy, once per round', () => {
  const state = battle()
  state.pawns[0] = new King(1, 0, 0, 'player', 4)
  state.pawns[1] = new Swordsman(2, 0, 1, 'player', 4)
  state.pawns.push(
    new Archer(4, -1, 0, 'player', 1),
    new Magician(5, 1, -1, 'player', 2),
    new Swordsman(6, 0, -1, 'player'),
    new Archer(7, -3, 0, 'player', 1),
  )
  const healed = reducer(state, { type: 'special' })
  assert.deepEqual(
    healed.pawns.map((p) => p.hp),
    [4, 5, 7, 2, 3, 5, 1],
  )
  assert.deepEqual(
    state.pawns.map((p) => p.hp),
    [4, 4, 7, 1, 2, 5, 1],
  )
  assert.equal(healed.pawns[0].energy, 2)
  assert.equal(healed.pawns[0].specialUsed, true)
  assert.equal(healed.randomState, state.randomState)
  assert.equal(healed.logCount, 4)
  assert.equal(reducer(healed, { type: 'special' }), healed)
  assert.equal(reducer(healed, { type: 'special', target: { q: 0, r: 1 } }), healed)
  healed.order = [3, 2, 1]
  healed.active = 2
  healed.pawns[2].q = 5
  healed.pawns[2].r = 5
  const nextRound = reducer(healed, { type: 'endTurn' })
  assert.equal(nextRound.round, 2)
  assert.equal(nextRound.pawns.find((p) => p.id === 1)!.specialUsed, false)

  state.pawns[0].energy = 1
  const exhausted = reducer(state, { type: 'special' })
  assert.deepEqual(
    exhausted.pawns.map((p) => p.hp),
    [4, 5, 7, 2, 3, 5, 1],
  )
  assert.equal(exhausted.pawns[0].energy, 0)
  assert.equal(exhausted.pawns[0].escapeChance, 0)
  assert.equal(activePawn(exhausted)?.id, 2)
})

test('Rally does not spend energy without wounded adjacent allies or when unavailable', () => {
  const state = battle()
  state.pawns[0] = new King(1, 0, 0, 'player', 4)
  state.pawns[1] = new Swordsman(2, 0, 1, 'player')
  assert.equal(reducer(state, { type: 'special' }), state)
  state.pawns[1].hp = 3
  const over = { ...state, winner: 'enemy' as const }
  assert.equal(reducer(over, { type: 'special' }), over)
  state.pawns[0].energy = 0
  assert.equal(reducer(state, { type: 'special' }), state)
  state.pawns[0].energy = 3
  state.pawns[0].specialUsed = true
  assert.equal(reducer(state, { type: 'special' }), state)
})

test('Charge aims a destination then a target, and moves and strikes atomically for two energy', () => {
  const state = battle()
  state.pawns[2].q = 3
  const destination = { q: 2, r: 0 }
  assert.ok(targetingTiles(state, { action: 'special' }).has('2,0'))
  assert.ok(targetingTiles(state, { action: 'special', destination }).has('3,0'))
  const charged = reducer(state, { type: 'special', target: { q: 3, r: 0 }, destination })
  assert.equal(charged.pawns[0].q, 2)
  assert.equal(charged.pawns[0].energy, 1)
  assert.equal(charged.pawns[2].hp, 5)
  assert.equal(state.pawns[0].q, 0)
  assert.equal(reducer(state, { type: 'special', target: { q: -3, r: 0 }, destination }), state)
  assert.equal(reducer(state, { type: 'special', target: { q: 3, r: 0 } }), state)
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
  assert.equal(
    reducer(state, { type: 'special', target: { q: 3, r: 0 }, destination: { q: 2, r: 0 } }),
    state,
  )
})

test('Aimed shot respects the archer dead zone and bypasses Escape without consuming randomness', () => {
  const state = battle()
  state.pawns[0] = new Archer(1, 0, 0, 'player')
  state.pawns[2].escapeChance = 60
  assert.equal(reducer(state, { type: 'special', target: { q: 1, r: 0 } }), state)
  state.pawns[2].q = 2
  const shot = reducer(state, { type: 'special', target: { q: 2, r: 0 } })
  assert.equal(shot.pawns[2].hp, 5)
  assert.equal(shot.pawns[0].energy, 1)
  assert.equal(shot.randomState, state.randomState)
  assert.equal(state.pawns[2].hp, 7)
})

test('Bomb hits nearby units including allies and handles multiple kills and victory', () => {
  const state = battle()
  state.pawns[0] = new Bomber(1, 0, 0, 'player')
  state.pawns[2].hp = 1
  state.pawns.push(
    new Archer(4, 2, 0, 'enemy', 1),
    new Swordsman(5, 1, 1, 'enemy'),
    new Swordsman(6, 0, 1, 'player'),
    new Archer(7, 5, 5, 'enemy'),
  )
  const bomb = { type: 'special', target: { q: 1, r: 0 } } as const
  const fired = reducer(state, bomb)
  assert.equal(fired.pawns[0].energy, 1)
  assert.deepEqual(
    fired.pawns.map((p) => p.id),
    [1, 2, 5, 6, 7],
  )
  assert.equal(fired.pawns.find((p) => p.id === 5)!.hp, 4)
  assert.equal(fired.pawns[0].hp, 2)
  assert.equal(fired.pawns.find((p) => p.id === 6)!.hp, 4)
  assert.equal(fired.pawns.find((p) => p.id === 7)!.hp, 3)
  assert.equal(fired.winner, 'player')
  const frame = transition(state, bomb).frames[0]
  assert.deepEqual(
    frame.state.pawns.filter((pawn) => pawn.hp <= 0).map((pawn) => pawn.id),
    [3, 4],
  )
  assert.equal(frame.state.winner, null)
  assert.deepEqual(fired, reducer(state, bomb))
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
  const fired = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(fired.pawns[2].hp, kingHp)
  assert.equal(fired.pawns[3].hp, archerHp)
  assert.equal(fired.randomState, random.state)
})

test('Illegal attack targets do not spend energy or advance randomness', () => {
  const state = battle()
  for (const [q, r] of [
    [0, 0],
    [-3, 0],
    [0, 1],
    [99, 99],
  ])
    assert.equal(reducer(state, { type: 'attack', q, r }), state)
  state.pawns[2].q = 2
  assert.equal(reducer(state, { type: 'attack', q: 2, r: 0 }), state)
})

test('Enemy units spend the same full energy budget as the player', () => {
  const state = battle()
  state.pawns[0].energy = 0
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
  state.pawns[0].energy = 0
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
  assert.ok(aimed.log.some((line) => line.includes('aimedShot')))
})

test('Enemy kings Rally, swordsmen Charge, and magicians use Fireball', () => {
  const king = battle()
  king.order = [1, 3, 2]
  king.pawns.push(new Swordsman(4, 1, 1, 'enemy', 3), new Archer(5, 2, 0, 'enemy', 1))
  const rallied = reducer(king, { type: 'endTurn' })
  assert.equal(rallied.pawns[3].hp, 4)
  assert.equal(rallied.pawns[4].hp, 2)
  assert.equal(rallied.pawns[2].specialUsed, true)
  for (const Ctor of [Swordsman, Magician]) {
    const state = battle()
    state.pawns[0].energy = 0
    state.pawns[2] = new Ctor(3, Ctor === Swordsman ? 3 : 2, 0, 'enemy', undefined, 2)
    state.pawns.push(new King(4, 5, 5, 'enemy'))
    state.order = [1, 3, 2, 4]
    if (Ctor === Magician) {
      state.pawns[1].q = -1
      state.pawns[1].r = 0
    }
    const next = reducer(state, { type: 'endTurn' })
    assert.equal(next.pawns[0].hp, Ctor === Swordsman ? 3 : 4)
    assert.equal(next.pawns[2].energy, 0)
    assert.ok(
      next.log.some((line) => line.includes(Ctor === Swordsman ? 'charge' : 'fireball')),
    )
  }
})

test('Enemy playback records each action in order without changing seeded results', () => {
  for (const strategy of [nearestTarget, huntTheKing]) {
    const engine = createBotGame(strategy)
    for (const seed of ['alpha', 'bravo', 'animation-review']) {
      const opening = engine.initialTransition(seed)
      assert.deepEqual(opening.state, engine.initialState(seed))
      assert.deepEqual(opening, engine.initialTransition(seed))
      let state = opening.state
      for (let turn = 0; turn < 30 && !state.winner; turn++) {
        const result = engine.transition(state, { type: 'endTurn' })
        assert.deepEqual(result.state, engine.reducer(state, { type: 'endTurn' }))
        assert.deepEqual(result, engine.transition(state, { type: 'endTurn' }))
        for (let i = 0; i < result.frames.length; i++) {
          const frame = result.frames[i]
          assert.equal(activePawn(frame.state)?.side, 'enemy')
          assert.equal(frame.state.winner, null)
          if (frame.effect) {
            const before = result.frames[i - 1].state
            assert.equal(activePawn(before)?.id, activePawn(frame.state)?.id)
            const gained =
              activePawn(frame.state)!.bonusEnergy - activePawn(before)!.bonusEnergy
            assert.ok(activePawn(before)!.energy + gained > activePawn(frame.state)!.energy)
            if (frame.effect.kind !== 'move') assert.ok(frame.state.logCount > before.logCount)
            else if (!gained && !frame.effect.impacts?.length)
              assert.equal(frame.state.logCount, before.logCount)
          }
        }
        state = result.state
      }
    }
  }
})

test('Playback snapshots keep intermediate health, logs, and dead target coordinates', () => {
  const state = battle()
  state.pawns[0].energy = 0
  state.order = [1, 3, 2]
  state.pawns[2].energy = 3
  const result = transition(state, { type: 'endTurn' })
  assert.equal(result.frames.length, 4)
  assert.deepEqual(
    result.frames.map((frame) => frame.state.pawns.find((p) => p.id === 1)?.hp),
    [5, 3, 1, -1],
  )
  assert.deepEqual(
    result.frames.map((frame) => frame.state.logCount),
    [0, 1, 2, 4],
  )
  assert.deepEqual(result.frames[3].effect, {
    kind: 'attack',
    from: { q: 1, r: 0 },
    to: { q: 0, r: 0 },
    impacts: [{ q: 0, r: 0, damage: 2 }],
  })
  const saved = JSON.stringify(result.frames)
  result.state.pawns[0].hp = 99
  result.state.order.reverse()
  result.state.log.push('later')
  assert.equal(JSON.stringify(result.frames), saved)
  assert.equal(state.pawns[0].hp, 5)
})

test('Enemy moves, Escape, and all specials have board effects', () => {
  const move = battle()
  move.order = [1, 3, 2]
  move.pawns[2].q = 5
  const moved = transition(move, { type: 'endTurn' })
  assert.equal(moved.frames[1].effect?.kind, 'move')
  assert.notDeepEqual(moved.frames[1].effect?.from, moved.frames[1].effect?.to)

  const escape = battle()
  escape.order = [1, 3, 2]
  escape.pawns[2].q = 5
  escape.pawns[2].r = 5
  for (const tile of escape.tiles.values()) tile.terrain = 'mountain'
  const escaped = transition(escape, { type: 'endTurn' })
  assert.equal(escaped.frames[1].effect?.kind, 'escape')
  assert.equal(activePawn(escaped.frames[1].state)?.escapeChance, 20)

  for (const Ctor of [King, Swordsman, Archer, Magician]) {
    const state = battle()
    state.order = [1, 3, 2, 4]
    state.pawns[2] = new Ctor(
      3,
      Ctor === Swordsman ? 3 : Ctor === King ? 1 : 2,
      0,
      'enemy',
      undefined,
      2,
    )
    state.pawns.push(new King(4, 5, 5, 'enemy'))
    if (Ctor === King) state.pawns.push(new Swordsman(5, 1, 1, 'enemy', 3))
    if (Ctor === Archer) state.pawns[0].escapeChance = 60
    if (Ctor === Magician) {
      state.pawns[1].q = -1
      state.pawns[1].r = 0
    }
    const result = transition(state, { type: 'endTurn' })
    assert.equal(
      result.frames[1].effect?.kind,
      Ctor === King ? 'rally' : Ctor === Magician ? 'fireball' : 'attack',
    )
    assert.ok(
      result.frames[1].state.log.some((line) => line.includes(state.pawns[2].special.name)),
    )
  }
})

test('Playback locks actions, reveals the killing blow before defeat, and can skip animation', () => {
  const state = battle()
  state.pawns[0].q = -5
  state.pawns[1].q = 0
  state.pawns[1].hp = 1
  state.order = [1, 3, 2]
  const result = transition(state, { type: 'endTurn' })
  assert.equal(result.state.winner, 'enemy')
  let playback = result
  for (const frame of result.frames) {
    assert.equal(playback.frames[0], frame)
    assert.equal(frame.state.winner, null)
    assert.equal(playbackReducer(playback, { type: 'endTurn' }), playback)
    assert.equal(playbackReducer(playback, { type: 'attack', q: 0, r: 0 }), playback)
    playback = playbackReducer(playback, { type: 'playbackNext' })
  }
  assert.equal(playback.frames.length, 0)
  assert.equal(playback.state.winner, 'enemy')
  assert.deepEqual(playbackReducer(result, { type: 'playbackFinish' }), playback)
  assert.deepEqual(
    playbackReducer(playback, { type: 'restart' }),
    initialTransition(state.seed),
  )
})

test('Enemies convert remaining energy in one end-turn action, including at the Escape cap', () => {
  for (const energy of [1, 2, 3]) {
    for (const chance of [0, 40, 60]) {
      const state = battle()
      state.order = [1, 3, 2]
      state.pawns[2].q = 5
      state.pawns[2].r = 5
      state.pawns[2].energy = energy
      state.pawns[2].escapeChance = chance
      for (const tile of state.tiles.values()) tile.terrain = 'mountain'
      const result = transition(state, { type: 'endTurn' })
      const enemy = result.state.pawns.find((p) => p.id === 3)!
      assert.equal(enemy.energy, 0)
      assert.equal(enemy.escapeChance, Math.min(60, chance + energy * 20))
      const effects = result.frames.filter((frame) => frame.effect?.kind === 'escape')
      assert.equal(effects.length, chance < 60 ? 1 : 0)
      if (effects.length) assert.equal(activePawn(effects[0].state)?.energy, 0)
    }
  }
})

test('Every seed places distinct pawns in their own three-row starting area', () => {
  const positionsById = new Map<number, Set<string>>()
  const rowsBySide = { player: new Set<number>(), enemy: new Set<number>() }
  for (let index = 0; index < 100; index++) {
    const seed = 'spawn-' + index
    const opening = initialTransition(seed)
    assert.deepEqual(opening, initialTransition(seed))
    const state = opening.frames[0]?.state ?? opening.state
    assert.equal(state.pawns.length, 12)
    assert.equal(new Set(state.pawns.map((p) => key(p.q, p.r))).size, 12)
    for (const pawn of state.pawns) {
      const firstRow = pawn.side === 'enemy' ? 0 : MAP_HEIGHT - 3
      assert.ok(pawn.r >= firstRow && pawn.r < firstRow + 3)
      const tileKey = key(pawn.q, pawn.r)
      assert.equal(state.tiles.get(tileKey)?.terrain, BIOMES[state.biome].ground)
      assert.equal(pawn.hp, pawn.maxHp)
      assert.equal(pawn.energy, pawn.maxEnergy)
      assert.equal(pawn.escapeChance, 0)
      const positions = positionsById.get(pawn.id) ?? new Set<string>()
      positions.add(tileKey)
      positionsById.set(pawn.id, positions)
      rowsBySide[pawn.side].add(pawn.r)
    }
  }
  assert.ok([...positionsById.values()].every((positions) => positions.size > 1))
  assert.equal(rowsBySide.player.size, 3)
  assert.equal(rowsBySide.enemy.size, 3)
})

test('Player and enemy movement stays silent while each enemy step still has a playback frame', () => {
  const state = battle()
  const moved = reducer(state, { type: 'move', q: 0, r: 1 })
  assert.deepEqual(moved.log, state.log)
  assert.equal(moved.logCount, state.logCount)
  state.pawns[0].energy = 0
  state.pawns[2].q = 5
  state.pawns[2].energy = 3
  state.order = [1, 3, 2]
  const result = transition(state, { type: 'endTurn' })
  assert.deepEqual(result.state.log, [])
  assert.equal(result.frames.length, 4)
  assert.deepEqual(
    result.frames.map((f) => activePawn(f.state)?.energy),
    [3, 2, 1, 0],
  )
  assert.deepEqual(
    result.frames.map((f) => f.state.logCount),
    [0, 0, 0, 0],
  )
  assert.equal(result.frames.filter((f) => f.effect?.kind === 'move').length, 3)
})

test('Seeded armies mirror one King and five different recruits', () => {
  const rosters = new Set<string>()
  const recruits = new Set<string>()
  for (let index = 0; index < 100; index++) {
    const opening = initialTransition('roster-' + index)
    const state = opening.frames[0]?.state ?? opening.state
    const player = state.pawns.filter((p) => p.side === 'player')
    const enemy = state.pawns.filter((p) => p.side === 'enemy')
    assert.equal(player.length, 6)
    assert.equal(enemy.length, 6)
    assert.equal(player.filter((p) => p.kind === 'king').length, 1)
    assert.deepEqual(
      player.map((p) => p.kind),
      enemy.map((p) => p.kind),
    )
    assert.ok(player[0] instanceof King)
    const randomRecruits = player.slice(1)
    assert.ok(randomRecruits.every((p) => RECRUIT_CLASSES.some((Unit) => p instanceof Unit)))
    assert.equal(new Set(randomRecruits.map((p) => p.kind)).size, 5)
    randomRecruits.forEach((p) => recruits.add(p.kind))
    rosters.add(player.map((p) => p.kind).join(','))
  }
  assert.ok(rosters.size > 1)
  assert.deepEqual([...recruits].sort(), [
    'archer',
    'berserker',
    'bomber',
    'bulwark',
    'hoplite',
    'magician',
    'ninja',
    'swordsman',
    'wolf',
  ])
})

test('Jump crosses blocked paths, targets only empty passable tiles within three hexes, and costs two energy', () => {
  const state = battle()
  state.pawns[0] = new Ninja(1, 0, 0, 'player')
  state.pawns[2].q = 4
  for (const tile of state.tiles.values()) tile.terrain = 'mountain'
  for (const k of ['0,0', '1,0', '2,0', '3,0', '0,3', '0,4', '-3,0', '4,0'])
    state.tiles.get(k)!.terrain = 'plain'
  state.tiles.get('0,3')!.terrain = 'forest'
  state.pawns.push(new Archer(4, 1, 0, 'enemy'), new Swordsman(5, 2, 0, 'player'))
  const original = structuredClone(state)
  assert.deepEqual(targetingTiles(state, { action: 'special' }), new Set(['0,3', '3,0']))
  for (const [q, r] of [
    [0, 0],
    [1, 0],
    [2, 0],
    [-3, 0],
    [0, 1],
    [0, 4],
    [99, 99],
  ]) {
    assert.equal(reducer(state, { type: 'special', target: { q, r } }), state)
  }
  assert.equal(reducer(state, { type: 'special' }), state)
  const jumped = reducer(state, { type: 'special', target: { q: 3, r: 0 } })
  assert.equal(jumped.pawns[0].q, 3)
  assert.equal(jumped.pawns[0].energy, 1)
  assert.equal(jumped.randomState, state.randomState)
  assert.deepEqual(jumped.log, state.log)
  assert.equal(jumped.logCount, 0)
  assert.deepEqual(structuredClone(state), original)
  const attacked = reducer(jumped, { type: 'attack', q: 4, r: 0 })
  assert.equal(attacked.pawns[2].hp, 2)
  assert.equal(attacked.pawns[0].energy, 0)
  assert.equal(activePawn(attacked)?.id, 2)
  assert.equal(attacked.winner, null)
})

test('Jump includes one to three hexes, requires two energy, and ends the turn when exhausted', () => {
  const state = battle()
  state.pawns[0] = new Ninja(1, 0, 0, 'player')
  for (const energy of [0, 1, 2, 3]) {
    state.pawns[0].energy = energy
    const destinations = jumpDestinations(state.tiles, state.pawns, state.pawns[0])
    if (energy < 2) {
      assert.deepEqual(destinations, [])
      assert.equal(reducer(state, { type: 'special', target: { q: 0, r: 1 } }), state)
      continue
    }
    assert.deepEqual(
      new Set(destinations.map((t) => hexDist(state.pawns[0], t))),
      new Set([1, 2, 3]),
    )
    const next = reducer(state, { type: 'special', target: { q: 0, r: 1 } })
    assert.equal(next.pawns[0].energy, energy - 2)
    assert.equal(next.pawns[0].r, 1)
    assert.equal(next.pawns[0].escapeChance, 0)
    assert.equal(activePawn(next)?.id, energy === 2 ? 2 : 1)
    assert.equal(next.randomState, state.randomState)
  }
  assert.deepEqual(jumpDestinations(state.tiles, state.pawns, state.pawns[1]), [])
})

test('Ninja attacks cost one energy and respect Escape; one incoming hit kills a Ninja', () => {
  for (let randomState = 0; randomState < 20; randomState++) {
    const state = battle()
    state.pawns[0] = new Ninja(1, 0, 0, 'player')
    state.pawns[2].escapeChance = 60
    state.randomState = randomState
    const random = new SeededRandom(randomState)
    const escaped = random.next() < 0.6
    const attacked = reducer(state, { type: 'attack', q: 1, r: 0 })
    assert.equal(attacked.pawns[2].hp, escaped ? 7 : 2)
    assert.equal(attacked.pawns[0].energy, 2)
    assert.equal(attacked.randomState, random.state)
  }
  const state = battle()
  state.pawns[0] = new Ninja(1, 0, 0, 'player', undefined, 0)
  state.order = [1, 3, 2]
  const struck = reducer(state, { type: 'endTurn' })
  assert.ok(!struck.pawns.some((p) => p.id === 1))
  assert.equal(state.pawns[0].hp, 1)
})

test('Enemy Ninja jumps over a blocked path then attacks, with deterministic ordered playback', () => {
  const state = battle()
  state.pawns[0].q = -5
  state.pawns[0].r = -5
  state.pawns[1].q = 0
  state.pawns[2] = new Ninja(3, 4, 0, 'enemy')
  state.pawns.push(new King(4, 5, 5, 'enemy'))
  state.order = [1, 3, 2, 4]
  for (const tile of state.tiles.values()) tile.terrain = 'mountain'
  for (const k of ['-5,-5', '0,0', '1,0', '4,0', '5,5']) state.tiles.get(k)!.terrain = 'plain'
  const result = transition(state, { type: 'endTurn' })
  assert.deepEqual(result, transition(state, { type: 'endTurn' }))
  assert.deepEqual(result.state, reducer(state, { type: 'endTurn' }))
  assert.deepEqual(
    result.frames.map((frame) => frame.effect?.kind),
    [undefined, 'move', 'attack'],
  )
  assert.deepEqual(
    result.frames.map((frame) => activePawn(frame.state)?.energy),
    [3, 1, 0],
  )
  assert.deepEqual(result.frames[1].effect, {
    kind: 'move',
    from: { q: 4, r: 0 },
    to: { q: 1, r: 0 },
  })
  assert.equal(result.frames[1].state.logCount, result.frames[0].state.logCount)
  assert.equal(result.state.pawns[1].hp, 2)
  assert.equal(result.state.pawns[2].energy, 0)
  assert.equal(state.pawns[2].q, 4)
  assert.equal(state.pawns[1].hp, 7)
})
