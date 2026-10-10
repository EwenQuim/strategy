import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Beast,
  King,
  Lancer,
  Necromancer,
  RECRUIT_CLASSES,
  Swordsman,
  movementDestinations,
  passable,
  reducer,
  targetingTiles,
  type GameState,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'

function field(pawns: Pawn[]): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++)
    for (let r = -5; r <= 5; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    seed: 'beast',
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

function denField(): GameState {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, -2, 3, 'enemy'),
  ])
  state.tiles.set('2,0', { q: 2, r: 0, terrain: 'plain', feature: 'den' })
  return state
}

test('Beasts only enter battle through authored dens and never as recruits', () => {
  assert.equal(RECRUIT_CLASSES.includes(Beast), false)
  assert.ok(RECRUIT_CLASSES.includes(Lancer))
  assert.ok(RECRUIT_CLASSES.includes(Necromancer))
})

test('Dens are impassable until their beast wakes', () => {
  const state = denField()
  assert.equal(passable(state.tiles.get('2,0')), false)
  assert.equal(movementDestinations(state.tiles, state.pawns, state.pawns[0]).has('2,0'), false)
  assert.equal(reducer(state, { type: 'move', q: 2, r: 0 }), state)
})

test('Stepping beside a den wakes a beast that fights for the moving side', () => {
  const state = denField()
  const next = reducer(state, { type: 'move', q: 1, r: 0 })
  const beast = next.pawns.find((pawn) => pawn.kind === 'beast')!
  assert.equal(beast.side, 'player')
  assert.equal(beast.hp, 6)
  assert.equal(beast.q, 2)
  assert.equal(beast.r, 0)
  assert.equal(next.tiles.get('2,0')!.feature, undefined)
  assert.ok(next.order.includes(beast.id))
  assert.ok(next.log.some((line) => line.includes('wakes the sleeping beast')))
  assert.equal(state.tiles.get('2,0')!.feature, 'den')
  assert.equal(state.pawns.length, 3)
})

test('The enemy wakes its own beast on its side', () => {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new Swordsman(3, 4, 0, 'enemy'),
    new King(4, -2, 3, 'enemy'),
  ])
  state.tiles.set('2,0', { q: 2, r: 0, terrain: 'plain', feature: 'den' })
  state.order = [3, 1, 2, 4]
  const next = reducer(state, { type: 'move', q: 3, r: 0 })
  const beast = next.pawns.find((pawn) => pawn.kind === 'beast')!
  assert.equal(beast.side, 'enemy')
  assert.equal(beast.q, 2)
  assert.equal(beast.r, 0)
})

test('A lancer dash wakes dens it passes', () => {
  const state = field([
    new Lancer(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, -2, 3, 'enemy'),
  ])
  state.tiles.set('2,1', { q: 2, r: 1, terrain: 'plain', feature: 'den' })
  const next = reducer(state, { type: 'special', target: { q: 4, r: 0 } })
  const beast = next.pawns.find((pawn) => pawn.kind === 'beast')!
  assert.equal(beast.side, 'player')
  assert.equal(beast.q, 2)
  assert.equal(beast.r, 1)
  assert.equal(next.pawns[0].q, 4)
  assert.equal(next.tiles.get('2,1')!.feature, undefined)
})

test('Rampage strikes every adjacent enemy for two damage, once per round', () => {
  const state = field([
    new Beast(1, 0, 0, 'player'),
    new Swordsman(2, 1, 0, 'enemy', 5),
    new Swordsman(3, 0, 1, 'enemy', 5),
    new Swordsman(4, 0, -1, 'player', 5),
    new King(5, 2, 3, 'player'),
    new King(6, -2, 3, 'enemy'),
  ])
  const next = reducer(state, { type: 'special' })
  assert.equal(next.pawns.find((pawn) => pawn.id === 2)!.hp, 3)
  assert.equal(next.pawns.find((pawn) => pawn.id === 3)!.hp, 3)
  assert.equal(next.pawns.find((pawn) => pawn.id === 4)!.hp, 5)
  assert.equal(next.pawns[0].energy, 0)
  assert.equal(next.pawns[0].specialUsed, true)
  next.active = next.order.indexOf(1)
  next.pawns[0].energy = 3
  assert.equal(targetingTiles(next, { action: 'special' }).size, 0)
  assert.equal(reducer(next, { type: 'special' }), next)
})

test('Rampage needs adjacent enemies and enough energy', () => {
  const lonely = field([
    new Beast(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new King(3, -2, 3, 'enemy'),
  ])
  assert.equal(targetingTiles(lonely, { action: 'special' }).size, 0)
  assert.equal(reducer(lonely, { type: 'special' }), lonely)
  const tired = field([
    new Beast(1, 0, 0, 'player', undefined, 2),
    new Swordsman(2, 1, 0, 'enemy', 5),
    new King(3, 2, 3, 'player'),
    new King(4, -2, 3, 'enemy'),
  ])
  assert.equal(reducer(tired, { type: 'special' }), tired)
})
