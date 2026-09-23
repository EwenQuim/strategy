import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BIOMES,
  PAWN_CLASSES,
  hexDist,
  initialState,
  reducer,
  specialTargets,
} from '../src/lib/engine/index.ts'
import type { GameState, Pawn, Side, Tile } from '../src/lib/engine/index.ts'

const make = (
  kind: keyof typeof PAWN_CLASSES,
  id: number,
  q: number,
  r: number,
  side: Side,
  hp?: number,
) => new PAWN_CLASSES[kind](id, q, r, side, hp)

function grid(pawns: Pawn[], order: number[]): GameState {
  const tiles = new Map<string, Tile>()
  for (let r = 0; r <= 2; r++)
    for (let q = -1; q <= 6; q++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    ...initialState('mech'),
    pawns,
    tiles,
    order,
    active: 0,
    phase: 'move',
    winner: null,
    round: 1,
  }
}

const kings = () => [make('king', 90, 0, 2, 'player'), make('king', 91, 6, 2, 'enemy')]
const at = (s: GameState, id: number) => s.pawns.find((p) => p.id === id)!
const special = (s: GameState, q: number, r: number) =>
  reducer(reducer(s, { type: 'act', action: 'special' }), { type: 'specialAt', q, r })

test('Bombard aims a line one turn, then fires it the next, hitting every enemy on it', () => {
  const bombard = make('bombard', 1, 0, 0, 'player')
  const foes = [make('swordsman', 2, 2, 0, 'enemy'), make('swordsman', 3, 3, 0, 'enemy')]
  let s = grid([bombard, ...foes, ...kings()], [1])
  s = special(s, 1, 0) // aim east
  const loaded = at(s, 1) as { barrageLine?: string[] | null }
  assert.ok(loaded.barrageLine?.includes('2,0') && loaded.barrageLine?.includes('3,0'))
  s = special(s, 2, 0) // fire
  assert.equal(at(s, 2).hp, 3)
  assert.equal(at(s, 3).hp, 3)
  assert.equal((at(s, 1) as { barrageLine?: string[] | null }).barrageLine, null)
})

test('Sniper aims one turn, then fires automatically the next, taking recoil', () => {
  const sniper = make('sniper', 1, 0, 0, 'player')
  let s = grid([sniper, make('swordsman', 2, 3, 0, 'enemy'), ...kings()], [1])
  s = special(s, 3, 0) // aim
  assert.equal((at(s, 1) as { aimedAt?: number | null }).aimedAt, 2)
  s = reducer(s, { type: 'act', action: 'special' }) // fire, no re-aim needed
  assert.equal(at(s, 2).hp, 1) // 5 - 4
  assert.equal(at(s, 1).hp, 2) // 3 - 1 recoil
})

test('Lancer reaches a target off the straight axes, striking and repositioning it', () => {
  const lancer = make('lancer', 1, 0, 0, 'player')
  const foe = make('swordsman', 2, 1, 1, 'enemy') // distance 2, not on a hex straight line
  let s = grid([lancer, foe, ...kings()], [1])
  s = special(s, 1, 1)
  assert.equal(at(s, 2).hp, 3) // triggered and struck
  assert.equal(hexDist(at(s, 1), { q: 1, r: 1 }), 1) // dashed adjacent to where the target was
  assert.notDeepEqual([at(s, 2).q, at(s, 2).r], [1, 1]) // shoved off its tile
})

test('Lancer can target an in-line enemy two tiles away across open ground', () => {
  const lancer = make('lancer', 1, 0, 2, 'player')
  const foe = make('bulwark', 2, 0, 0, 'enemy') // two tiles straight up, (0,1) empty between
  const s = grid([lancer, foe, ...kings()], [1])
  assert.ok(specialTargets(s.pawns, at(s, 1)).length > 0, 'Lance should be offered')
  const after = special(s, 0, 0)
  assert.ok(at(after, 2).hp < 10, 'the target should be struck')
})

test('Harpooner drags an enemy off the straight axes to its side', () => {
  const harpooner = make('harpooner', 1, 0, 0, 'player')
  const foe = make('swordsman', 2, 1, 1, 'enemy') // distance 2, not on a hex straight line
  let s = grid([harpooner, foe, ...kings()], [1])
  s = special(s, 1, 1)
  assert.equal(hexDist(harpooner, at(s, 2)), 1) // pulled adjacent
  assert.equal(at(s, 2).hp, 4)
})

test('Cleric heals an adjacent wounded ally', () => {
  const cleric = make('cleric', 1, 0, 0, 'player')
  let s = grid([cleric, make('swordsman', 2, 1, 0, 'player', 1), ...kings()], [1])
  s = special(s, 1, 0)
  assert.equal(at(s, 2).hp, 4)
})

test('Barrage, Lance, and Harpoon are offered when an enemy is in range (UI gate)', () => {
  for (const kind of ['bombard', 'lancer', 'harpooner'] as const) {
    const p = make(kind, 1, 0, 0, 'player')
    const s = grid([p, make('swordsman', 2, 2, 0, 'enemy'), ...kings()], [1])
    assert.ok(specialTargets(s.pawns, at(s, 1)).length > 0, kind + ' should offer its special')
  }
})

test('Every biome exposes ground and theme so custom play and rendering work', () => {
  for (const biome of Object.values(BIOMES)) {
    assert.ok(biome.name && biome.ground)
    assert.ok(Object.keys(biome.theme).length > 0)
  }
})
