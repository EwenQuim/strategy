import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  King,
  Necromancer,
  Swordsman,
  reducer,
  targetingTiles,
  transition,
  type GameState,
  type Pawn,
  type Tile,
} from '../src/lib/engine/index.ts'
import { raisable } from '../src/lib/engine/pawns/necromancer.ts'

function field(pawns: Pawn[]): GameState {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++)
    for (let r = -5; r <= 5; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    seed: 'necromancer',
    biome: 'verdant',
    hellfire: [],
    randomState: 0,
    tiles,
    pawns,
    order: pawns.map((pawn) => pawn.id),
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

const necromancers = () => [
  new Necromancer(1, 0, 0, 'player'),
  new King(2, 2, 3, 'player'),
  new King(3, -2, 3, 'enemy'),
]

test('Raise pulls back the most recently fallen non-king unit', () => {
  assert.equal(raisable([{ kind: 'archer', side: 'enemy' }])?.kind, 'archer')
  assert.equal(
    raisable([
      { kind: 'archer', side: 'enemy' },
      { kind: 'swordsman', side: 'player' },
    ])?.kind,
    'swordsman',
  )
  assert.equal(raisable([{ kind: 'king', side: 'enemy' }]), undefined)
  assert.equal(raisable([]), undefined)
})

test('Raise returns the fallen unit at one health on an adjacent empty tile', () => {
  const state = field(necromancers())
  state.blows = [
    { fallen: [{ kind: 'king', side: 'enemy' }] },
    {
      fallen: [
        { kind: 'archer', side: 'enemy' },
        { kind: 'swordsman', side: 'player' },
      ],
    },
  ]
  assert.deepEqual(
    targetingTiles(state, { action: 'special' }),
    new Set(['1,0', '0,1', '-1,0', '0,-1', '1,-1', '-1,1']),
  )
  const result = transition(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(result.frames[0].effect?.kind, 'raise')
  const raised = result.state.pawns.find((pawn) => pawn.id === 4)!
  assert.ok(raised instanceof Swordsman)
  assert.equal(raised.side, 'player')
  assert.equal(raised.hp, 1)
  assert.equal(raised.energy, 1)
  assert.equal(raised.q, 1)
  assert.equal(raised.r, 0)
  assert.equal(result.state.pawns[0].energy, 0)
  assert.equal(result.state.order.at(-1), 4)
  assert.ok(result.state.log.some((line) => line.includes('swordsman rises from the dead')))
  assert.equal(state.pawns.length, 3)
})

test('Without fallen units Raise has no targets and rejects every tile', () => {
  const state = field(necromancers())
  assert.equal(targetingTiles(state, { action: 'special' }).size, 0)
  assert.equal(reducer(state, { type: 'special', target: { q: 1, r: 0 } }), state)
  state.blows = [{ fallen: [{ kind: 'king', side: 'enemy' }] }]
  assert.equal(targetingTiles(state, { action: 'special' }).size, 0)
  assert.equal(reducer(state, { type: 'special', target: { q: 1, r: 0 } }), state)
})

test('Raise rejects occupied or distant tiles', () => {
  const state = field(necromancers())
  state.blows = [{ fallen: [{ kind: 'archer', side: 'enemy' }] }]
  state.pawns.push(new Swordsman(4, 1, 0, 'player'))
  assert.equal(reducer(state, { type: 'special', target: { q: 1, r: 0 } }), state)
  assert.equal(reducer(state, { type: 'special', target: { q: 3, r: 0 } }), state)
})

test('Raise is once per round, even when channel discounts the cost', () => {
  const state = field(necromancers())
  state.blows = [{ fallen: [{ kind: 'archer', side: 'enemy' }] }]
  state.pawns[0].adrenaline = 2
  const next = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(next.pawns[0].energy, 2)
  assert.equal(targetingTiles(next, { action: 'special' }).size, 0)
  assert.equal(reducer(next, { type: 'special', target: { q: 0, r: 1 } }), next)
})

test('The raised unit joins the turn order and fights for its new side', () => {
  const state = field([
    new Necromancer(1, 0, 0, 'player'),
    new King(2, 2, 3, 'player'),
    new Swordsman(3, 2, 0, 'enemy', 2),
    new King(4, -2, 3, 'enemy'),
  ])
  state.blows = [{ fallen: [{ kind: 'swordsman', side: 'enemy' }] }]
  const raised = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  const risen = raised.pawns.find((pawn) => pawn.id === 5)!
  assert.equal(risen.side, 'player')
  raised.active = raised.order.indexOf(5)
  const strike = reducer(raised, { type: 'attack', q: 2, r: 0 })
  assert.equal(
    strike.pawns.some((pawn) => pawn.id === 3),
    false,
  )
  assert.equal(strike.winner, null)
})
