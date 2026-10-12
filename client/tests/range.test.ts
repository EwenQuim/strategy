import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Archer,
  King,
  Lancer,
  Ninja,
  rangeTiles,
  threatenedTiles,
} from '../src/lib/engine/index.ts'
import { field } from './field.ts'

test('Inspection shows signature ranges, including watchtower shots and Rush lines', () => {
  const state = field([
    new Archer(1, 0, 0, 'player'),
    new King(2, -3, 0, 'player'),
    new King(3, 4, 0, 'enemy'),
  ])
  assert.ok(!rangeTiles(state.pawns[0], state.tiles, 'special').has('4,0'))
  state.tiles.get('0,0')!.feature = 'watchtower'
  assert.ok(rangeTiles(state.pawns[0], state.tiles, 'special').has('4,0'))
  const lancer = new Lancer(1, 0, 0, 'player')
  assert.ok(rangeTiles(lancer, state.tiles, 'special').has('4,0'))
  assert.ok(!rangeTiles(lancer, state.tiles, 'special').has('2,1'))
})

test('Threat preview includes Ambush across gaps and excludes lethal lava landings', () => {
  const state = field([
    new Ninja(1, 0, 0, 'enemy'),
    new King(2, -3, -2, 'enemy'),
    new King(3, 4, 0, 'player'),
  ])
  state.tiles.delete('1,0')
  assert.ok(threatenedTiles(state.tiles, state.pawns, 'enemy').has('4,0'))
})
