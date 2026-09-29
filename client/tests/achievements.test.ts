import assert from 'node:assert/strict'
import { test } from 'node:test'
import { King, Ninja, reducer, type GameState, type Tile } from '../src/lib/engine/index.ts'
import { earnedAchievements } from '../src/lib/achievements.ts'

function duel(): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -3; q <= 3; q++) tiles.set(q + ',0', { q, r: 0, terrain: 'plain' })
  return {
    seed: 'achievements',
    biome: 'verdant',
    hellfire: [],
    randomState: 0,
    tiles,
    pawns: [
      new Ninja(1, 0, 0, 'player'),
      new King(2, -3, 0, 'player'),
      new King(3, 1, 0, 'enemy', 1),
    ],
    order: [1, 2, 3],
    active: 0,
    round: 1,
    lastClashRound: 0,
    blows: [],
    escapes: [],
    winner: null,
    log: [],
    logCount: 0,
  }
}

test('A first-round ninja regicide earns its achievements for the winner only', () => {
  const won = reducer(duel(), { type: 'attack', q: 1, r: 0 })
  assert.equal(won.winner, 'player')
  assert.deepEqual(won.blows, [
    {
      by: { id: 1, kind: 'ninja', side: 'player', hp: 1, special: false, watchtower: false },
      fallen: [{ kind: 'king', side: 'enemy' }],
    },
  ])
  assert.deepEqual(earnedAchievements(won, 'player'), [
    'cleanHands',
    'ninjaRegicide',
    'speedrun',
  ])
  assert.deepEqual(earnedAchievements(won, 'enemy'), [])
})
