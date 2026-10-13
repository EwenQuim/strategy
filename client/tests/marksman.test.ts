import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Marksman,
  King,
  activePawn,
  reducer,
  targetingTiles,
  type Pawn,
} from '../src/lib/engine/index.ts'
import { field } from './field.ts'

const marksmanField = (foe: Pawn) =>
  field([new Marksman(1, 0, 0, 'player'), new King(2, -3, -2, 'player'), foe])

test('Snipe strikes at distance 3-5 and never closer, with +1 on a watchtower', () => {
  for (const distance of [3, 4, 5]) {
    const state = marksmanField(new King(3, distance, 0, 'enemy'))
    const action = { type: 'special', target: { q: distance, r: 0 } } as const
    assert.ok(targetingTiles(state, { action: 'special' }).has(`${distance},0`))
    const next = reducer(state, action)
    assert.equal(next.pawns[2].hp, 6)
    assert.equal(state.pawns[2].hp, 7)
  }
  for (const distance of [1, 2]) {
    const state = marksmanField(new King(3, distance, 0, 'enemy'))
    assert.equal(targetingTiles(state, { action: 'special' }).size, 0)
  }
  const tower = field([
    new Marksman(1, -1, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 5, 0, 'enemy'),
  ])
  tower.tiles.get('-1,0')!.feature = 'watchtower'
  assert.ok(targetingTiles(tower, { action: 'special' }).has('5,0'))
  assert.equal(reducer(tower, { type: 'special', target: { q: 5, r: 0 } }).pawns[2].hp, 6)
})

test('A marksman either moves or shoots, never both in one activation', () => {
  const state = marksmanField(new King(3, 4, 0, 'enemy'))
  assert.equal(state.pawns[0].energy, 2)
  const moved = reducer(state, { type: 'move', q: 1, r: 0 })
  assert.equal(moved.pawns[0].energy, 1)
  assert.equal(targetingTiles(moved, { action: 'special' }).size, 0)
  const shot = reducer(state, { type: 'special', target: { q: 4, r: 0 } })
  assert.equal(shot.pawns[0].energy, 0)
  assert.notEqual(activePawn(shot)?.id, 1)
})

test('A fresh marksman starts at its own energy cap, not the standard three', () => {
  const marksman = new Marksman(1, 0, 0, 'player')
  assert.equal(marksman.maxHp, 2)
  assert.equal(marksman.energy, 2)
  marksman.bonusEnergy = 1
  assert.equal(marksman.maxEnergy, 3)
})
