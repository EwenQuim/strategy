import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Archer,
  Bomber,
  Bulwark,
  King,
  Lancer,
  Magician,
  Ninja,
  Swordsman,
  reducer,
} from '../src/lib/engine/index.ts'
import { Berserker } from '../src/lib/engine/pawns/berserker.ts'
import { Hoplite } from '../src/lib/engine/pawns/hoplite.ts'
import { Wolf } from '../src/lib/engine/pawns/wolf.ts'
import { tileChoices } from '../src/lib/tileChoices.ts'
import { field } from './field.ts'

for (const Unit of [Ninja, Swordsman]) {
  test(`${Unit.name}: current-position attacks coexist with landing choices`, () => {
    const state = field([
      new Unit(1, 0, 0, 'player'),
      new King(2, -3, -2, 'player'),
      new King(3, 1, 0, 'enemy', 4),
    ])
    const before = structuredClone(state)
    const choices = tileChoices(state, { action: 'special' })
    const attack = choices.get('1,0')!
    assert.equal(attack.kind, 'attack')
    assert.ok('action' in attack)
    assert.deepEqual(attack.action, {
      type: 'special',
      target: { q: 1, r: 0 },
      destination: { q: 0, r: 0 },
    })
    const next = reducer(state, attack.action)
    assert.equal(next.pawns[0].q, 0)
    assert.equal(next.pawns[0].r, 0)
    assert.equal(next.pawns[2].hp, 4 - state.pawns[0].attack.damage)
    const landing = choices.get('1,-1')!
    assert.equal(landing.kind, 'landing')
    assert.ok('nextAim' in landing)
    const fromLanding = tileChoices(state, landing.nextAim).get('1,0')!
    assert.ok('action' in fromLanding)
    assert.equal(reducer(state, fromLanding.action).pawns[0].r, -1)
    assert.deepEqual(structuredClone(state), before)
  })
}

test('Optional landings resolve immediately only when there is no enemy choice', () => {
  const state = field([
    new Ninja(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 4, 0, 'enemy', 4),
  ])
  const choices = tileChoices(state, { action: 'special' })
  assert.deepEqual(choices.get('-2,0'), {
    kind: 'move',
    action: { type: 'special', destination: { q: -2, r: 0 } },
  })
  assert.deepEqual(choices.get('3,0'), {
    kind: 'landing',
    nextAim: { action: 'special', destination: { q: 3, r: 0 } },
  })
  state.pawns[0] = new Swordsman(1, 0, 0, 'player')
  assert.equal(tileChoices(state, { action: 'special' }).has('-2,0'), false)
})

test('Lancer retains direct move and enemy choices', () => {
  const state = field([
    new Lancer(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 4, 0, 'enemy'),
  ])
  const choices = tileChoices(state, { action: 'special' })
  assert.equal(choices.get('2,0')!.kind, 'move')
  assert.equal(choices.get('4,0')!.kind, 'attack')
})

for (const Unit of [Archer, Berserker, Hoplite, King, Wolf, Magician, Bomber]) {
  test(`${Unit.name}: damaging special targets are attack choices without changing commands`, () => {
    const state = field([
      new Unit(1, 0, 0, 'player'),
      new King(2, -3, -2, 'player'),
      new King(3, Unit === Archer ? 2 : 1, 0, 'enemy', 4),
    ])
    const before = structuredClone(state)
    const choices = tileChoices(state, { action: 'special' })
    assert.ok(choices.size > 0)
    for (const [position, choice] of choices) {
      assert.equal(choice.kind, 'attack')
      assert.ok('action' in choice)
      const tile = state.tiles.get(position)!
      assert.deepEqual(choice.action, { type: 'special', target: { q: tile.q, r: tile.r } })
    }
    if (Unit === Magician || Unit === Bomber)
      assert.equal(choices.get('2,0')?.kind, 'attack', 'empty area target is still offensive')
    assert.deepEqual(structuredClone(state), before)
  })
}

test('Protect is not highlighted as a damaging attack', () => {
  const state = field([
    new Bulwark(1, 0, 0, 'player'),
    new King(2, 1, 0, 'player'),
    new King(3, 4, 0, 'enemy'),
  ])
  assert.notEqual(tileChoices(state, { action: 'special' }).get('1,0')?.kind, 'attack')
})
