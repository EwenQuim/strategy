import assert from 'node:assert/strict'
import { test } from 'node:test'
import { King, Swordsman, Bulwark, reducer } from '../src/lib/engine/index.ts'
import { Harpooner } from '../src/lib/engine/pawns/harpooner.ts'
import { Reachfighter } from '../src/lib/engine/pawns/reachfighter.ts'
import { legalActions } from '../src/lib/engine/ai/options.ts'
import { field } from './field.ts'

const battle = () =>
  field([
    new Harpooner(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 3, 2, 'enemy'),
    new Swordsman(4, 2, 0, 'enemy'),
  ])
const action = { type: 'special', target: { q: 2, r: 0 } } as const

test('The matched-stat control strikes without pulling', () => {
  const state = battle()
  state.pawns[0] = new Reachfighter(1, 0, 0, 'player')
  const next = reducer(state, action)
  assert.equal(next.pawns[3]!.q, 2)
  assert.equal(next.pawns[3]!.hp, state.pawns[3]!.hp - 1)
  assert.equal(next.pawns[0]!.energy, 1)
  assert.equal(next.pawns[0]!.maxHp, new Harpooner(0, 0, 0, 'player').maxHp)
})

test('Harpoon strikes and pulls a distant survivor, keeping the attacker mobile and the input untouched', () => {
  const state = battle()
  assert.ok(legalActions(state).some((a) => JSON.stringify(a) === JSON.stringify(action)))
  const next = reducer(state, action)
  assert.equal(next.pawns.find((p) => p.id === 4)!.q, 1)
  assert.equal(next.pawns.find((p) => p.id === 4)!.hp, state.pawns[3]!.hp - 1)
  assert.equal(next.pawns[0]!.energy, 1)
  assert.equal(next.pawns[0]!.q, 0)
  assert.equal(state.pawns[3]!.q, 2)
})

test('Pull destinations must be adjacent, empty and passable; attacks still cross gaps', () => {
  for (const obstruction of ['occupied', 'mountain', 'gap'] as const) {
    const state = battle()
    if (obstruction === 'occupied') state.pawns.push(new Swordsman(5, 1, 0, 'player'))
    else if (obstruction === 'gap') state.tiles.delete('1,0')
    else state.tiles.get('1,0')!.terrain = 'mountain'
    const next = reducer(state, action)
    assert.notEqual(next, state)
    assert.notEqual(
      next.pawns.find((p) => p.id === 4)!.q + ',' + next.pawns.find((p) => p.id === 4)!.r,
      '1,0',
    )
  }
  const state = battle()
  for (const at of ['1,0', '-1,0', '0,1', '0,-1', '1,-1', '-1,1']) state.tiles.delete(at)
  assert.equal(reducer(state, action), state)
})

test('Protection intercepts the hit without moving the protected enemy; lethal hits do not pull', () => {
  const state = battle()
  const protector = new Bulwark(5, 2, -1, 'enemy')
  protector.protectingId = 4
  state.pawns.push(protector)
  const next = reducer(state, action)
  assert.equal(next.pawns.find((p) => p.id === 4)!.q, 2)
  assert.equal(next.pawns.find((p) => p.id === 5)!.hp, 9)
  const lethal = battle()
  lethal.pawns[3]!.hp = 1
  assert.ok(!reducer(lethal, action).pawns.some((p) => p.id === 4))
})

test('Pulling applies landing lava and runes to the victim, and works for either side', () => {
  const state = battle()
  state.tiles.get('1,0')!.terrain = 'lava'
  state.tiles.get('1,0')!.feature = 'rune'
  for (const at of ['-1,0', '0,1', '0,-1', '1,-1', '-1,1']) state.tiles.delete(at)
  const next = reducer(state, action)
  assert.equal(next.pawns.find((p) => p.id === 4)!.hp, state.pawns[3]!.hp - 2)
  assert.equal(next.pawns.find((p) => p.id === 4)!.bonusEnergy, 2)
  const reversed = field([
    new Harpooner(1, 0, 0, 'enemy'),
    new King(2, -3, -2, 'enemy'),
    new King(3, 3, 2, 'player'),
    new Swordsman(4, 2, 0, 'player'),
  ])
  assert.equal(reducer(reversed, action).pawns.find((p) => p.id === 4)!.q, 1)
})
