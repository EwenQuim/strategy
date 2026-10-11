import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Archer,
  Beast,
  Bomber,
  Bulwark,
  King,
  Lancer,
  Magician,
  Necromancer,
  Ninja,
  PAWN_CLASSES,
  Swordsman,
  canAttack,
  canUseSpecial,
  movementDestinations,
  reducer,
  targetingTiles,
  type GameState,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'

const { berserker: Berserker, hoplite: Hoplite, wolf: Wolf } = PAWN_CLASSES

function field(pawns: Pawn[]): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++)
    for (let r = -5; r <= 5; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    seed: 'adrenaline',
    biome: 'verdant',
    hellfire: [],
    randomState: 0,
    tiles,
    pawns,
    order: pawns.map((pawn) => pawn.id),
    active: 0,
    round: 1,
    lastClashRound: 0,
    blows: [],
    escapes: [],
    winner: null,
    log: [],
    logCount: 0,
  }
}

test('Leftover energy banks as adrenaline and each end turn rebanks it', () => {
  const pawn = new Swordsman(1, 0, 0, 'player', undefined, 2)
  pawn.endTurn([])
  assert.equal(pawn.adrenaline, 2)
  assert.equal(pawn.energy, 0)
  pawn.energy = 3
  pawn.endTurn([])
  assert.equal(pawn.adrenaline, 3)
  pawn.energy = 0
  pawn.endTurn([])
  assert.equal(pawn.adrenaline, 0)
})

test('Rage and momentum: banked adrenaline adds damage to berserker, wolf, lancer and beast strikes', () => {
  for (const [Ctor, damage] of [
    [Berserker, 2],
    [Wolf, 2],
    [Lancer, 1],
    [Beast, 2],
  ] as const) {
    const state = field([
      new Ctor(1, 0, 0, 'player'),
      new King(2, 2, 3, 'player'),
      new King(3, 1, 0, 'enemy', 7),
    ])
    state.pawns[0].adrenaline = 2
    const next = reducer(state, { type: 'attack', q: 1, r: 0 })
    assert.equal(next.pawns[2].hp, 7 - damage - 2)
    assert.equal(state.pawns[2].hp, 7)
    const calm = field([
      new Ctor(1, 0, 0, 'player'),
      new King(2, 2, 3, 'player'),
      new King(3, 1, 0, 'enemy', 7),
    ])
    assert.equal(reducer(calm, { type: 'attack', q: 1, r: 0 }).pawns[2].hp, 7 - damage)
  }
})

test('Focus: banked adrenaline stretches the archer range by one hex per point', () => {
  const state = field([
    new Archer(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, 4, 0, 'enemy', 7),
  ])
  assert.equal(targetingTiles(state, { action: 'attack' }).size, 0)
  state.pawns[0].adrenaline = 1
  assert.deepEqual(targetingTiles(state, { action: 'attack' }), new Set(['4,0']))
  const next = reducer(state, { type: 'attack', q: 4, r: 0 })
  assert.equal(next.pawns[2].hp, 6)
  assert.equal(canAttack(state.pawns[0], new King(9, 5, 0, 'enemy')), false)
})

test('Brace: bulwarks and hoplites absorb banked adrenaline from incoming blows, down to 1 damage', () => {
  for (const Ctor of [Bulwark, Hoplite]) {
    for (const adrenaline of [1, 3]) {
      const state = field([
        new Ctor(1, 0, 0, 'player'),
        new King(2, 2, 3, 'player'),
        new Swordsman(3, 1, 0, 'enemy'),
      ])
      state.order = [3, 1, 2]
      state.pawns[0].adrenaline = adrenaline
      const next = reducer(state, { type: 'attack', q: 0, r: 0 })
      assert.equal(next.pawns[0].hp, next.pawns[0].maxHp - 1)
      assert.ok(next.log.some((line) => line.includes('braces')))
    }
  }
})

test('Swift: banked adrenaline stretches ninja strides and discounts their energy cost', () => {
  const state = field([
    new Ninja(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, 5, 5, 'enemy'),
  ])
  const ninja = state.pawns[0]
  ninja.energy = 1
  assert.equal(movementDestinations(state.tiles, state.pawns, ninja).get('3,0'), undefined)
  ninja.adrenaline = 2
  assert.equal(movementDestinations(state.tiles, state.pawns, ninja).get('3,0'), 1)
  const next = reducer(state, { type: 'move', q: 3, r: 0 })
  assert.equal(next.pawns[0].q, 3)
  assert.equal(next.pawns[0].energy, 0)
})

test('Channel: banked adrenaline discounts magician and necromancer specials, down to 1', () => {
  const magician = new Magician(1, 0, 0, 'player')
  assert.equal(magician.specialCost, 2)
  assert.equal(canUseSpecial(magician), true)
  magician.energy = 1
  assert.equal(canUseSpecial(magician), false)
  magician.adrenaline = 1
  assert.equal(magician.specialCost, 1)
  assert.equal(canUseSpecial(magician), true)
  magician.adrenaline = 5
  assert.equal(magician.specialCost, 1)

  const necromancer = new Necromancer(4, 0, 0, 'player')
  necromancer.adrenaline = 2
  assert.equal(necromancer.specialCost, 1)
})

test('A discounted fireball spends the channeled cost, not the printed one', () => {
  const state = field([
    new Magician(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, 2, 0, 'enemy', 7),
  ])
  state.pawns[0].energy = 1
  state.pawns[0].adrenaline = 1
  const next = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(next.pawns[2].hp, 6)
  assert.equal(next.pawns[0].energy, 0)
})

test('Rally: banked adrenaline strengthens the king healing by one per point', () => {
  const state = field([
    new King(1, 0, 0, 'player'),
    new Swordsman(2, 1, 0, 'player', 2),
    new King(3, 5, 5, 'enemy'),
  ])
  state.pawns[0].adrenaline = 2
  const next = reducer(state, { type: 'special' })
  assert.equal(next.pawns[1].hp, 5)
  assert.equal(next.pawns[0].energy, 2)
  const calm = field([
    new King(1, 0, 0, 'player'),
    new Swordsman(2, 1, 0, 'player', 2),
    new King(3, 5, 5, 'enemy'),
  ])
  assert.equal(reducer(calm, { type: 'special' }).pawns[1].hp, 3)
})

test('Bomb throw: banked adrenaline extends the bomber reach by one hex per point', () => {
  const rosters = () => [
    new Bomber(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, 4, 0, 'enemy', 7),
  ]
  const state = field(rosters())
  assert.equal(targetingTiles(state, { action: 'special' }).has('4,0'), false)
  state.pawns[0].adrenaline = 2
  assert.ok(targetingTiles(state, { action: 'special' }).has('4,0'))
  const next = reducer(state, { type: 'special', target: { q: 4, r: 0 } })
  assert.equal(next.pawns[2].hp, 6)
  assert.equal(next.pawns[0].energy, 1)
})

test('Swift: the free steps are spent by the first move', () => {
  const state = field([
    new Ninja(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, 5, 5, 'enemy'),
  ])
  state.pawns[0].adrenaline = 2
  const first = reducer(state, { type: 'move', q: 2, r: 0 })
  assert.equal(first.pawns[0].energy, 3)
  assert.equal(first.pawns[0].adrenaline, 0)
  const second = reducer(first, { type: 'move', q: 3, r: 0 })
  assert.equal(second.pawns[0].energy, 2)
})
