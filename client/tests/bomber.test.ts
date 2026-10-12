import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Bomber,
  King,
  Swordsman,
  neighbors,
  rangeTiles,
  targetingTiles,
  reducer,
} from '../src/lib/engine/index.ts'
import { abilityDamage, specialTargets } from '../src/lib/engine/combat.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { field } from './field.ts'

test('Watchtowers extend Bomb centers to three tiles on all six lines for both sides, without increasing splash', () => {
  for (const side of ['player', 'enemy'] as const) {
    const foe = side === 'player' ? 'enemy' : 'player'
    for (const direction of neighbors(0, 0)) {
      const center = { q: direction.q * 3, r: direction.r * 3 }
      const target = new King(3, direction.q * 4, direction.r * 4, foe)
      const state = field([
        new Bomber(1, 0, 0, side),
        new King(2, -3, -2, side),
        target,
        new Swordsman(4, direction.q * 5, direction.r * 5, foe),
      ])
      assert.ok(!targetingTiles(state, { action: 'special' }).has(`${center.q},${center.r}`))
      assert.equal(reducer(state, { type: 'special', target: center }), state)
      const tower = state.tiles.get('0,0')!
      tower.feature = 'watchtower'
      assert.ok(rangeTiles(state.pawns[0], state.tiles).has(`${center.q},${center.r}`))
      assert.ok(targetingTiles(state, { action: 'special' }).has(`${center.q},${center.r}`))
      assert.ok(
        state.pawns[0].special
          .candidates(state.pawns[0], state)
          .some(
            (action) =>
              action.type === 'special' &&
              action.target?.q === center.q &&
              action.target.r === center.r,
          ),
      )
      assert.ok(specialTargets(state.pawns, state.pawns[0], tower).includes(target))
      assert.equal(
        abilityDamage(state.pawns[0], {
          target,
          from: tower,
          movementCost: 0,
          tiles: state.tiles,
        }),
        1,
      )
      const next = reducer(state, { type: 'special', target: center })
      assert.equal(next.pawns[0].energy, 1)
      assert.equal(next.pawns[2].hp, 6)
      assert.equal(next.pawns[3].hp, 5)
      assert.equal(target.hp, 7)
    }
  }
})

test('Bomber tower bonuses follow the firing position, require enough energy, and disappear after moving away', () => {
  const state = field([
    new Bomber(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 4, 0, 'enemy'),
  ])
  const pawn = state.pawns[0]
  const position = {
    target: state.pawns[2],
    from: state.tiles.get('1,0')!,
    movementCost: 1,
    tiles: state.tiles,
  }
  assert.equal(abilityDamage(pawn, position), 1)
  position.target.q = 5
  assert.equal(abilityDamage(pawn, position), 0)
  position.from.feature = 'watchtower'
  assert.equal(abilityDamage(pawn, position), 1)
  assert.equal(abilityDamage(pawn, { ...position, movementCost: 2 }), 0)

  state.tiles.get('0,0')!.feature = 'watchtower'
  const moved = reducer(state, { type: 'move', q: 0, r: -1 })
  assert.ok(!targetingTiles(moved, { action: 'special' }).has('3,-1'))
  assert.equal(reducer(moved, { type: 'special', target: { q: 3, r: -1 } }), moved)
})

test('The bot uses a watchtower Bomb to hit a king four tiles away', async () => {
  const state = field([
    new Bomber(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 4, 0, 'enemy', 1),
  ])
  state.tiles.get('0,0')!.feature = 'watchtower'
  const next = (await new DepthsearchBot({ latitude: 0 }).chooseActions(state)).reduce(
    reducer,
    state,
  )
  assert.equal(next.winner, 'player')
})
