import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activePawn,
  reducer,
  transition,
  PAWN_CLASSES,
  King,
  Swordsman,
  Ninja,
} from '../src/lib/engine/index.ts'
import { Hoplite } from '../src/lib/engine/pawns/hoplite.ts'
import { Wolf } from '../src/lib/engine/pawns/wolf.ts'
import { field } from './field.ts'

test('Every pawn has one usable signature, immutable execution and consistent frames', () => {
  for (const [kind, Unit] of Object.entries(PAWN_CLASSES)) {
    const state = field([
      new Unit(1, 0, 0, 'player'),
      new King(2, 0, -1, 'player', 4),
      new King(3, 3, 0, 'enemy'),
      new Swordsman(4, 1, 0, 'enemy'),
    ])
    const before = structuredClone(state)
    const action = state.pawns[0].special.candidates(state.pawns[0], state)[0]
    assert.ok(action, kind)
    const next = transition(state, action)
    assert.notEqual(next.state, state, kind)
    assert.equal(next.state.pawns.find((p) => p.id === 1)?.specialUsed, true, kind)
    assert.deepEqual(next.state, reducer(state, action))
    assert.deepEqual(next, transition(state, action))
    assert.deepEqual(structuredClone(state), before)
    if (activePawn(next.state)?.id === 1) {
      assert.equal(reducer(next.state, action), next.state)
      assert.equal(
        reducer(next.state, { type: 'endTurn' }).pawns.find((p) => p.id === 1)?.energy,
        0,
      )
    }
  }
})

test('Ninja ambush strikes for three across gaps, then can retreat; lava can kill before striking', () => {
  const state = field([
    new Ninja(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 4, 0, 'enemy'),
  ])
  state.tiles.delete('1,0')
  state.tiles.get('2,0')!.terrain = 'mountain'
  const action = {
    type: 'special',
    destination: { q: 3, r: 0 },
    target: { q: 4, r: 0 },
  } as const
  const next = reducer(state, action)
  assert.equal(next.pawns[0].q, 3)
  assert.equal(next.pawns[2].hp, 4)
  assert.equal(reducer(next, { type: 'move', q: 3, r: 1 }).pawns[0].r, 1)
  state.tiles.get('3,0')!.terrain = 'lava'
  const burned = reducer(state, action)
  assert.ok(!burned.pawns.some((p) => p.id === 1))
  assert.equal(burned.pawns.find((p) => p.id === 3)?.hp, 7)
})

test('Hoplite pushes survivors onto lava but cannot push through occupied ground', () => {
  const state = field([
    new Hoplite(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 1, 0, 'enemy'),
  ])
  state.tiles.get('2,0')!.terrain = 'lava'
  const next = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(next.pawns[2].q, 2)
  assert.equal(next.pawns[2].hp, 5)
  state.pawns.push(new Swordsman(4, 2, 0, 'enemy'))
  const blocked = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(blocked.pawns[2].q, 1)
  assert.equal(blocked.pawns[2].hp, 6)
})

test('Rallying blow heals one wounded ally and Pack Hunt boosts an ally still able to act', () => {
  const king = field([
    new King(1, 0, 0, 'player'),
    new Swordsman(2, 0, 1, 'player', 2),
    new King(3, 1, 0, 'enemy'),
  ])
  assert.equal(reducer(king, { type: 'special', target: { q: 1, r: 0 } }).pawns[1].hp, 3)
  const wolf = field([
    new Wolf(1, 0, 0, 'player'),
    new King(2, 0, 1, 'player'),
    new King(3, 1, 0, 'enemy'),
  ])
  const next = reducer(wolf, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(next.pawns[1].energy, 4)
  assert.equal(next.pawns[2].hp, 5)
})

test('A completed round restores energy and signatures, and basic attack commands are rejected', () => {
  let state = field([new King(1, 0, 0, 'player'), new King(2, 3, 0, 'enemy')])
  const oldCommand = { type: 'attack', q: 3, r: 0 } as unknown as Parameters<typeof reducer>[1]
  assert.equal(reducer(state, oldCommand), state)
  state = reducer(reducer(state, { type: 'endTurn' }), { type: 'endTurn' })
  assert.equal(state.round, 2)
  assert.ok(state.pawns.every((p) => p.energy === 3 && !p.specialUsed))
})
