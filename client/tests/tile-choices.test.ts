import assert from 'node:assert/strict'
import { test } from 'node:test'
import { King, Lancer, Ninja, Swordsman, reducer } from '../src/lib/engine/index.ts'
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
