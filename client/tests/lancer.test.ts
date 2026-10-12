import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Lancer,
  King,
  Swordsman,
  reducer,
  targetingTiles,
  transition,
} from '../src/lib/engine/index.ts'
import { field } from './field.ts'

test('Rush can sprint without hitting, or hit only directly ahead of the chosen landing', () => {
  const state = field([
    new Lancer(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 4, 0, 'enemy'),
    new Swordsman(4, 3, 1, 'enemy'),
  ])
  assert.ok(targetingTiles(state, { action: 'special' }).has('2,0'))
  assert.ok(!targetingTiles(state, { action: 'special' }).has('4,0'))
  const sprint = reducer(state, { type: 'special', target: { q: 2, r: 0 } })
  assert.equal(sprint.pawns[0].q, 2)
  assert.equal(sprint.pawns[2].hp, 7)
  const hit = transition(state, { type: 'special', target: { q: 3, r: 0 } })
  assert.equal(hit.state.pawns[0].q, 3)
  assert.equal(hit.state.pawns[2].hp, 5)
  assert.equal(hit.state.pawns[3].hp, 5)
})

test('Rush stops before allies, enemies, gaps and blocked terrain, collecting runes along its path', () => {
  for (const block of ['ally', 'enemy', 'gap', 'mountain'] as const) {
    const state = field([
      new Lancer(1, 0, 0, 'player'),
      new King(2, -3, -2, 'player'),
      new King(3, 4, 0, 'enemy'),
    ])
    if (block === 'gap') state.tiles.delete('2,0')
    else if (block === 'mountain') state.tiles.get('2,0')!.terrain = 'mountain'
    else state.pawns.push(new Swordsman(4, 2, 0, block === 'ally' ? 'player' : 'enemy'))
    assert.equal(reducer(state, { type: 'special', target: { q: 3, r: 0 } }), state)
  }
  const state = field([
    new Lancer(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 4, 0, 'enemy'),
  ])
  state.tiles.get('1,0')!.feature = 'rune'
  const next = reducer(state, { type: 'special', target: { q: 3, r: 0 } })
  assert.equal(next.pawns[0].energy, 3)
  assert.equal(next.tiles.get('1,0')!.feature, undefined)
  assert.equal(state.tiles.get('1,0')!.feature, 'rune')
})
