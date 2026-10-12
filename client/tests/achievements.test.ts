import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Bomber,
  King,
  Ninja,
  reducer,
  type Action,
  type Axial,
  type Biome,
  type GameState,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'
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

function field(pawns: Pawn[], biome: Biome = 'verdant', hellfire: Axial[] = []): GameState {
  return { ...duel(), biome, hellfire, pawns, order: pawns.map((pawn) => pawn.id) }
}

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce(reducer, state)

test('A first-round ninja regicide earns its achievements for the winner only', () => {
  const won = reducer(duel(), {
    type: 'special',
    target: { q: 1, r: 0 },
    destination: { q: 0, r: 0 },
  })
  assert.equal(won.winner, 'player')
  assert.deepEqual(won.blows, [
    {
      by: { id: 1, kind: 'ninja', side: 'player', hp: 1, special: true, watchtower: false },
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

test('A lava suicide followed by a royal kill earns Extra Crispy', () => {
  const state = field([
    new Ninja(1, 0, 0, 'player'),
    new King(2, 3, 0, 'player'),
    new King(3, 2, 0, 'enemy', 1),
  ])
  state.tiles.set('1,0', { q: 1, r: 0, terrain: 'lava' })
  const won = play(
    state,
    { type: 'move', q: 1, r: 0 },
    { type: 'special', target: { q: 2, r: 0 } },
  )
  assert.equal(won.winner, 'player')
  assert.deepEqual(won.blows, [
    {
      by: { id: 1, kind: 'ninja', side: 'player', hp: 0, special: false, watchtower: false },
      fallen: [{ kind: 'ninja', side: 'player' }],
    },
    {
      by: { id: 2, kind: 'king', side: 'player', hp: 7, special: true, watchtower: false },
      fallen: [{ kind: 'king', side: 'enemy' }],
    },
  ])
  assert.deepEqual(earnedAchievements(won, 'player'), [
    'cleanHands',
    'doneRight',
    'partyOfOne',
    'speedrun',
    'crispy',
  ])
})

test('Winning after Hellfire took one of your units earns The Gods Missed', () => {
  const won = play(
    field(
      [
        new Ninja(1, 0, 0, 'player'),
        new King(2, 1, 0, 'player'),
        new King(3, 2, 0, 'enemy', 1),
      ],
      'hell',
      [{ q: 0, r: 0 }],
    ),
    { type: 'endTurn' },
    { type: 'endTurn' },
    { type: 'endTurn' },
    { type: 'special', target: { q: 2, r: 0 } },
  )
  assert.equal(won.winner, 'player')
  assert.equal(won.blows[0].by, undefined)
  assert.deepEqual(earnedAchievements(won, 'player'), [
    'cleanHands',
    'doneRight',
    'partyOfOne',
    'speedrun',
    'smite',
    'daredevil',
  ])
})

test('Hellfire killing the enemy King earns Divine Assist', () => {
  const won = play(
    field([new King(1, 0, 0, 'player'), new King(2, 2, 0, 'enemy', 1)], 'hell', [
      { q: 2, r: 0 },
    ]),
    { type: 'endTurn' },
    { type: 'endTurn' },
  )
  assert.equal(won.winner, 'player')
  assert.deepEqual(earnedAchievements(won, 'player'), [
    'cleanHands',
    'partyOfOne',
    'speedrun',
    'divineAssist',
  ])
})

test('Bombing your own Ninja earns Oops, and the enemy King Boom, King', () => {
  const won = play(
    field([
      new Bomber(1, 0, 0, 'player'),
      new Ninja(2, 1, 0, 'player'),
      new King(3, 2, 0, 'enemy', 1),
      new King(4, -3, 0, 'player'),
    ]),
    { type: 'special', target: { q: 1, r: 0 } },
  )
  assert.equal(won.winner, 'player')
  assert.deepEqual(earnedAchievements(won, 'player'), [
    'cleanHands',
    'speedrun',
    'oops',
    'boomRegicide',
  ])
})

test('Winning with your King inside the Hellfire blast earns Daredevil', () => {
  const won = play(
    field([new King(1, 0, 0, 'player'), new King(2, 1, 0, 'enemy', 1)], 'hell', [
      { q: 0, r: 0 },
    ]),
    { type: 'special', target: { q: 1, r: 0 } },
  )
  assert.equal(won.winner, 'player')
  assert.deepEqual(earnedAchievements(won, 'player'), [
    'cleanHands',
    'doneRight',
    'partyOfOne',
    'speedrun',
    'daredevil',
  ])
})
