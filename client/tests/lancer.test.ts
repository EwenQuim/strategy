import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Lancer,
  King,
  Swordsman,
  reducer,
  targetingTiles,
  transition,
  neighbors,
} from '../src/lib/engine/index.ts'
import { legalActions } from '../src/lib/engine/ai/options.ts'
import { field } from './field.ts'

test('Rush can sprint without hitting, or hit only directly ahead of the chosen landing', () => {
  const state = field([
    new Lancer(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 4, 0, 'enemy'),
    new Swordsman(4, 3, 1, 'enemy'),
  ])
  assert.ok(targetingTiles(state, { action: 'special' }).has('2,0'))
  assert.ok(targetingTiles(state, { action: 'special' }).has('4,0'))
  const sprint = reducer(state, { type: 'special', target: { q: 2, r: 0 } })
  assert.equal(sprint.pawns[0].q, 2)
  assert.equal(sprint.pawns[2].hp, 7)
  const hit = transition(state, { type: 'special', target: { q: 3, r: 0 } })
  assert.equal(hit.state.pawns[0].q, 3)
  assert.equal(hit.state.pawns[2].hp, 5)
  assert.equal(hit.state.pawns[3].hp, 5)
  assert.deepEqual(transition(state, { type: 'special', target: { q: 4, r: 0 } }), hit)
})

test('Rush selects adjacent or distant enemies on all six lines, for either side', () => {
  for (const side of ['player', 'enemy'] as const) {
    for (const direction of neighbors(0, 0)) {
      for (const distance of [1, 4]) {
        const target = { q: direction.q * distance, r: direction.r * distance }
        const state = field([
          new Lancer(1, 0, 0, side),
          new King(2, -3, -2, side),
          new King(3, target.q, target.r, side === 'player' ? 'enemy' : 'player'),
        ])
        const action = { type: 'special', target } as const
        assert.ok(targetingTiles(state, { action: 'special' }).has(`${target.q},${target.r}`))
        assert.ok(
          legalActions(state).some(
            (candidate) => JSON.stringify(candidate) === JSON.stringify(action),
          ),
        )
        const next = reducer(state, action)
        assert.equal(next.pawns[0].q, target.q - direction.q)
        assert.equal(next.pawns[0].r, target.r - direction.r)
        assert.equal(next.pawns[0].energy, 1)
        assert.equal(next.pawns[2].hp, 5)
        assert.equal(state.pawns[2].hp, 7)
      }
    }
  }
})

test('Selecting a Rush enemy cannot bypass units, gaps, terrain or lethal lava', () => {
  for (const obstruction of ['ally', 'enemy', 'gap', 'mountain', 'lava'] as const) {
    const state = field([
      new Lancer(1, 0, 0, 'player', 1),
      new King(2, -3, -2, 'player'),
      new King(3, 4, 0, 'enemy'),
    ])
    if (obstruction === 'gap') state.tiles.delete('2,0')
    else if (obstruction === 'ally' || obstruction === 'enemy')
      state.pawns.push(new Swordsman(4, 2, 0, obstruction === 'ally' ? 'player' : 'enemy'))
    else state.tiles.get('2,0')!.terrain = obstruction
    const next = reducer(state, { type: 'special', target: { q: 4, r: 0 } })
    assert.equal(next.pawns.find((p) => p.id === 3)?.hp, 7)
    if (obstruction === 'lava') assert.ok(!next.pawns.some((p) => p.id === 1))
    else {
      assert.equal(next, state)
      assert.ok(!targetingTiles(state, { action: 'special' }).has('4,0'))
    }
  }
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
