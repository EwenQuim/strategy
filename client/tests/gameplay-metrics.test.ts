import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialState, type GameState, type PawnKind } from '../src/lib/engine/index.ts'
import {
  gateFailures,
  matchMetrics,
  summarize,
  type MatchMetrics,
  type RoundTelemetry,
} from '../scripts/gameplay-metrics.ts'

// The benchmark aggregates are pure functions; these tests pin their exact math so gameplay
// comparisons across rule changes stay meaningful.

const round = (over: Partial<RoundTelemetry> & { round: number }): RoundTelemetry => ({
  clash: false,
  kills: 0,
  minDistance: 3,
  meanDistance: 4,
  value: 0.5,
  turtleIndex: { player: 0, enemy: 0 },
  moves: 0,
  retreats: 0,
  ...over,
})

const finalState = (winner: GameState['winner'], blows: GameState['blows']): GameState => ({
  ...initialState('metrics'),
  winner,
  blows,
})

const blow = (kind: PawnKind): GameState['blows'] => [
  {
    by: { id: 1, kind, side: 'player', hp: 3, special: false, watchtower: false },
    fallen: [{ kind: 'archer', side: 'enemy' }],
  },
]

test('Contact and stall metrics follow clashes and distance progress', () => {
  const metrics = matchMetrics(
    'seed',
    'a',
    'b',
    [
      round({ round: 1, minDistance: 5 }),
      round({ round: 2, minDistance: 5 }),
      round({ round: 3, clash: true, minDistance: 2 }),
      round({ round: 4, clash: true, minDistance: 2 }),
    ],
    finalState('player', blow('swordsman')),
  )
  assert.equal(metrics.firstContactRound, 3)
  assert.equal(metrics.maxStallStreak, 1)
})

test('Decision round, lead changes and swing ignore the zeroed winner snapshot', () => {
  const metrics = matchMetrics(
    'seed',
    'a',
    'b',
    [
      round({ round: 1, value: 0.3 }),
      round({ round: 2, value: 0.6 }),
      round({ round: 3, value: 0.8 }),
      round({ round: 4, value: 0.5 }),
    ],
    finalState('player', blow('swordsman')),
  )
  assert.equal(metrics.decisionRound, 2)
  assert.equal(metrics.decisionShare, 0.5)
  assert.equal(metrics.leadChanges, 1)
  assert.equal(metrics.swing, 0.25)
})

test('Retreat ratio sums per-round moves and turtle index only counts late rounds', () => {
  const metrics = matchMetrics(
    'seed',
    'a',
    'b',
    [
      round({ round: 1, moves: 2, retreats: 1, turtleIndex: { player: 1, enemy: 1 } }),
      round({ round: 6, moves: 2, turtleIndex: { player: 0.5, enemy: 0 } }),
    ],
    finalState('player', blow('swordsman')),
  )
  assert.equal(metrics.retreatRatio, 0.25)
  assert.deepEqual(metrics.lateTurtleIndex, { player: 0.5, enemy: 0 })
})

test('Killer diversity counts distinct striker kinds', () => {
  const metrics = matchMetrics(
    'seed',
    'a',
    'b',
    [round({ round: 1 })],
    finalState('player', [...blow('swordsman'), ...blow('ninja'), ...blow('swordsman')]),
  )
  assert.equal(metrics.killerKinds, 2)
})

test('Population gates fail on late contact, stalls, draws, turtle wins and early decisions', () => {
  const stalled: MatchMetrics = {
    ...matchMetrics(
      'seed',
      'a',
      'b',
      [round({ round: 1 }), round({ round: 2, clash: true })],
      finalState('player', blow('swordsman')),
    ),
    firstContactRound: 6,
    maxStallStreak: 5,
    decisionShare: 0.2,
  }
  const turtleWin: MatchMetrics = {
    ...stalled,
    playerBot: 'turtle',
    winner: 'player',
  }
  const report = summarize([stalled, turtleWin])
  assert.equal(report.drawRate, 0)
  const failures = gateFailures(report)
  assert.ok(failures.some((failure) => failure.includes('meet too late')))
  assert.ok(failures.some((failure) => failure.includes('stalled 5 rounds')))
  assert.ok(failures.some((failure) => failure.includes('decided early')))
  assert.ok(failures.some((failure) => failure.includes('turtle stall probe won 1/1')))
})
