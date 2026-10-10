import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  King,
  Necromancer,
  PAWN_CLASSES,
  RECRUIT_CLASSES,
  Skeleton,
  Swordsman,
  reducer,
  targetingTiles,
  transition,
  type GameState,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'
import { summonReady } from '../src/lib/engine/pawns/necromancer.ts'

function field(pawns: Pawn[]): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++)
    for (let r = -5; r <= 5; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    seed: 'necromancer',
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

// An enemy within 2 hexes of the Necromancer: the proximity Summon demands.
const necromancers = () => [
  new Necromancer(1, 0, 0, 'player'),
  new King(2, 2, 3, 'player'),
  new Swordsman(3, 2, 0, 'enemy', 6),
  new King(4, -2, 3, 'enemy'),
]

test('Summon spawns a skeleton with 2 health and 1 energy on an adjacent empty tile', () => {
  const state = field(necromancers())
  assert.deepEqual(
    targetingTiles(state, { action: 'special' }),
    new Set(['1,0', '0,1', '-1,0', '0,-1', '1,-1', '-1,1']),
  )
  const result = transition(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(result.frames[0].effect?.kind, 'summon')
  const skeleton = result.state.pawns.find((pawn) => pawn.id === 5)!
  assert.ok(skeleton instanceof Skeleton)
  assert.equal(skeleton.side, 'player')
  assert.equal(skeleton.hp, 2)
  assert.equal(skeleton.energy, 1)
  assert.equal(skeleton.q, 1)
  assert.equal(skeleton.r, 0)
  assert.equal(result.state.pawns[0].energy, 1)
  assert.equal(result.state.order.at(-1), 5)
  assert.ok(result.state.log.some((line) => line.includes('skeleton rises')))
  assert.equal(state.pawns.length, 4)
})

test('Summon demands an enemy within 2 hexes, so a back-line Necromancer cannot flood', () => {
  const state = field([
    new Necromancer(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, -2, 3, 'enemy'),
  ])
  assert.equal(summonReady(state.pawns[0], state.pawns), false)
  assert.equal(targetingTiles(state, { action: 'special' }).size, 0)
  assert.equal(reducer(state, { type: 'special', target: { q: 1, r: 0 } }), state)

  state.pawns.push(new Swordsman(4, 3, 0, 'enemy', 6))
  assert.equal(summonReady(state.pawns[0], state.pawns), false)
  assert.equal(targetingTiles(state, { action: 'special' }).size, 0)

  state.pawns[3].q = 2
  assert.equal(summonReady(state.pawns[0], state.pawns), true)
  assert.equal(targetingTiles(state, { action: 'special' }).size, 6)
})

test('Summon is repeatable, and Channel only discounts the first summon', () => {
  const state = field(necromancers())
  state.pawns[0].adrenaline = 1
  assert.equal(state.pawns[0].specialCost, 1)
  let next = reducer(state, { type: 'special', target: { q: 1, r: 0 } }) as GameState
  assert.equal(next.pawns[0].adrenaline, 0)
  assert.equal(next.pawns[0].specialCost, 2)
  next = reducer(next, { type: 'special', target: { q: 0, r: 1 } }) as GameState
  const skeletons = next.pawns.filter((pawn) => pawn instanceof Skeleton)
  assert.equal(skeletons.length, 2)
  assert.equal(next.pawns[0].energy, 0)
  assert.equal(targetingTiles(next, { action: 'special' }).size, 0)
})

test('Channel discounts Summon down to 1 per banked point', () => {
  const necromancer = new Necromancer(1, 0, 0, 'player')
  assert.equal(necromancer.specialCost, 2)
  necromancer.adrenaline = 1
  assert.equal(necromancer.specialCost, 1)
  necromancer.adrenaline = 5
  assert.equal(necromancer.specialCost, 1)
})

test('Summon rejects occupied, distant or blocked tiles', () => {
  const state = field(necromancers())
  state.pawns.push(new Swordsman(5, 1, 0, 'player'))
  assert.equal(reducer(state, { type: 'special', target: { q: 1, r: 0 } }), state)
  assert.equal(reducer(state, { type: 'special', target: { q: 3, r: 0 } }), state)
  state.tiles.get('0,1')!.terrain = 'mountain'
  assert.equal(reducer(state, { type: 'special', target: { q: 0, r: 1 } }), state)
})

test('Summon offers no tile without energy or free adjacent ground', () => {
  const state = field(necromancers())
  state.pawns[0].energy = 1
  assert.equal(targetingTiles(state, { action: 'special' }).size, 0)
  assert.equal(reducer(state, { type: 'special', target: { q: 1, r: 0 } }), state)
  state.pawns[0].energy = 3
  for (const [q, r] of [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
    [-1, 1],
  ])
    state.pawns.push(new Swordsman(state.pawns.length + 1, q, r, 'player'))
  assert.equal(targetingTiles(state, { action: 'special' }).size, 0)
})

test('The skeleton is a weak melee unit that only enters battles as a summon', () => {
  const skeleton = new Skeleton(1, 0, 0, 'player')
  assert.equal(skeleton.maxHp, 2)
  assert.deepEqual(skeleton.attack, { damage: 1, minRange: 1, maxRange: 1 })
  assert.ok(PAWN_CLASSES.skeleton === Skeleton)
  assert.ok(!RECRUIT_CLASSES.some((Unit) => Unit === Skeleton))
})

test('Flood: a skeleton hits harder for every friendly skeleton beside it', () => {
  const state = field([
    new Skeleton(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new Swordsman(3, 1, 0, 'enemy', 6),
    new King(4, -2, 3, 'enemy'),
  ])
  const strike = reducer(state, { type: 'attack', q: 1, r: 0 }) as GameState
  assert.equal(strike.pawns.find((pawn) => pawn.id === 3)!.hp, 5)

  state.pawns.push(new Skeleton(5, 0, 1, 'player'), new Skeleton(6, -1, 0, 'player'))
  const flooded = reducer(state, { type: 'attack', q: 1, r: 0 }) as GameState
  assert.equal(flooded.pawns.find((pawn) => pawn.id === 3)!.hp, 3)
})

test('Flood only counts friendly skeletons', () => {
  const state = field([
    new Skeleton(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new Swordsman(3, 1, 0, 'enemy', 6),
    new King(4, -2, 3, 'enemy'),
  ])
  state.pawns.push(new Swordsman(5, 0, 1, 'player'), new Skeleton(6, -1, 0, 'enemy'))
  const strike = reducer(state, { type: 'attack', q: 1, r: 0 }) as GameState
  assert.equal(strike.pawns.find((pawn) => pawn.id === 3)!.hp, 5)
})

test('Rattle gives 1 energy to each adjacent friendly skeleton, once per round', () => {
  const state = field([
    new Skeleton(1, 0, 0, 'player'),
    new Skeleton(2, 1, 0, 'player', 2, 0),
    new King(3, 2, 3, 'player'),
    new King(4, -2, 3, 'enemy'),
  ])
  const rattled = reducer(state, { type: 'special' }) as GameState
  const ally = rattled.pawns.find((pawn) => pawn.id === 2)!
  assert.equal(ally.energy, 1)
  assert.equal(ally.bonusEnergy, 1)
  assert.equal(rattled.pawns[0].energy, 2)
  assert.equal(reducer(rattled, { type: 'special' }), rattled)
})

test('Rattle does nothing without an adjacent friendly skeleton', () => {
  const state = field([
    new Skeleton(1, 0, 0, 'player'),
    new Swordsman(2, 1, 0, 'player'),
    new King(3, 2, 3, 'player'),
    new King(4, -2, 3, 'enemy'),
  ])
  assert.equal(reducer(state, { type: 'special' }), state)
})

test('A summon never reuses the id of a fallen unit still in the turn order', () => {
  const state = field(necromancers())
  state.order.push(5)
  const next = reducer(state, { type: 'special', target: { q: 1, r: 0 } }) as GameState
  const skeleton = next.pawns.find((pawn) => pawn instanceof Skeleton)!
  assert.equal(skeleton.id, 6)
  assert.equal(new Set(next.order).size, next.order.length)
})
