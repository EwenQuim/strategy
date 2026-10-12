import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  King,
  Swordsman,
  neighbors,
  reducer,
  transition,
  targetingTiles,
  type Side,
} from '../src/lib/engine/index.ts'
import { abilityDamage } from '../src/lib/engine/combat.ts'
import { Hoplite } from '../src/lib/engine/pawns/hoplite.ts'
import { field } from './field.ts'

test('Thrust strikes bent distance-two targets without pushing them, for either side', () => {
  for (const side of ['player', 'enemy'] as const) {
    const foe: Side = side === 'player' ? 'enemy' : 'player'
    for (const [q, r] of [
      [2, -1],
      [1, -2],
      [-2, 1],
      [-1, 2],
      [1, 1],
      [-1, -1],
    ]) {
      const state = field([new Hoplite(1, 0, 0, side), new King(2, q, r, foe)])
      const next = reducer(state, { type: 'special', target: { q, r } })
      assert.equal(next.pawns[1].hp, 6)
      assert.equal(next.pawns[1].q, q)
      assert.equal(next.pawns[1].r, r)
      assert.equal(state.pawns[1].hp, 7)
    }
  }
})

test('Units screen straight distance-two Thrust targets; the front enemy takes damage without either unit moving', () => {
  for (const side of ['player', 'enemy'] as const) {
    const foe: Side = side === 'player' ? 'enemy' : 'player'
    for (const direction of neighbors(0, 0)) {
      for (const screenSide of [side, foe]) {
        const target = { q: direction.q * 2, r: direction.r * 2 }
        const state = field([
          new Hoplite(1, 0, 0, side),
          new King(2, -3, -2, side),
          new King(3, target.q, target.r, foe),
          new Swordsman(4, direction.q, direction.r, screenSide),
        ])
        assert.ok(!targetingTiles(state, { action: 'special' }).has(`${target.q},${target.r}`))
        assert.equal(reducer(state, { type: 'special', target }), state)
        assert.equal(
          abilityDamage(state.pawns[0], {
            target: state.pawns[2],
            from: state.pawns[0],
            movementCost: 0,
            pawns: state.pawns,
          }),
          0,
        )
        if (screenSide === foe) {
          const result = transition(state, { type: 'special', target: direction })
          assert.equal(result.state.pawns[3].hp, 4)
          assert.equal(result.state.pawns[2].hp, 7)
          assert.deepEqual(
            result.state.pawns.slice(2).map(({ q, r }) => ({ q, r })),
            [target, direction],
          )
          assert.deepEqual(result.frames[0].effect?.blocked, [direction])
          assert.equal(result.state.pawns[0].energy, 1)
        }
      }
    }
  }
})

test('Thrust never pushes a blocking ally or chain-pushes after a lethal hit', () => {
  for (const hp of [1, 3]) {
    const state = field([
      new Hoplite(1, 0, 0, 'player'),
      new King(2, 2, 0, 'player'),
      new King(3, 4, 0, 'enemy'),
      new Swordsman(4, 1, 0, 'enemy', hp),
    ])
    const next = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
    assert.equal(next.pawns[1].q, 2)
    assert.equal(next.pawns[1].hp, 7)
    if (hp === 1) assert.ok(!next.pawns.some((p) => p.id === 4))
    else assert.equal(next.pawns[3].q, 1)
  }
})

test('Thrust pushes one tile directly away on all six hex lines at both distances', () => {
  for (const direction of neighbors(0, 0)) {
    for (const distance of [1, 2]) {
      const q = direction.q * distance
      const r = direction.r * distance
      const state = field([new Hoplite(1, 0, 0, 'player'), new King(2, q, r, 'enemy')])
      const next = reducer(state, { type: 'special', target: { q, r } })
      assert.equal(next.pawns[1].hp, 6)
      assert.equal(next.pawns[1].q, q + direction.q)
      assert.equal(next.pawns[1].r, r + direction.r)
    }
  }
})
