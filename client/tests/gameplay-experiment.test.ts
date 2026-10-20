import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  King,
  Swordsman,
  Lancer,
  Bomber,
  Bulwark,
  Magician,
  initialState,
  reducer,
} from '../src/lib/engine/index.ts'
import { Wolf } from '../src/lib/engine/pawns/wolf.ts'
import { field } from './field.ts'
import {
  saveStart,
  restoreStart,
  playExperiment,
  type ExperimentMatch,
} from '../scripts/gameplay-experiment.ts'
import { pairedComparison } from '../scripts/gameplay-report.ts'
import { matchMetrics, roundTelemetry } from '../scripts/gameplay-metrics.ts'
import type { Bot } from '../src/bots/bot.ts'

const passive: Bot = {
  name: 'passive',
  options: {},
  chooseActions: async () => [{ type: 'endTurn' }],
}

test('Directional attacks count as opening opportunities without an adjacent enemy target tile', async () => {
  const state = field([
    new Magician(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 3, 0, 'enemy'),
  ])
  const match = await playExperiment(metadata, saveStart(state), passive, passive, 1)
  assert.equal(match.units[0]!.attackOpportunities, 1)
  assert.equal(match.units[0]!.declinedAttacks, 1)
})

test('Restoring an authored start preserves warning count and initiative configuration', () => {
  const setup = {
    biome: 'hell',
    hellfireCount: 1,
    map: ['......', '......', '......', '......', '......', '......'],
    player: [
      { kind: 'king', col: 0, row: 5 },
      { kind: 'swordsman', col: 1, row: 5 },
    ],
    enemy: [
      { kind: 'king', col: 5, row: 0 },
      { kind: 'swordsman', col: 4, row: 0 },
    ],
    firstEnemyKinds: ['swordsman'],
  } as const
  const state = initialState('warnings', setup)
  const restored = restoreStart(saveStart(state))
  assert.deepEqual(restored.setup, state.setup)
  assert.deepEqual(restored.order, state.order)
})
const metadata = {
  id: 'test',
  seed: 'test',
  biome: 'desert' as const,
  roster: 'test',
  playerBot: 'scripted',
  enemyBot: 'passive',
  probe: false,
}

test('Substitution preserves the exact board, initiative and random stream without mutating the saved start', () => {
  const state = field([
    new Swordsman(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 3, 2, 'enemy'),
  ])
  const start = saveStart(state)
  const next = restoreStart(start, { from: 'swordsman', to: 'lancer', side: 'player' })
  assert.equal(next.pawns[0]!.kind, 'lancer')
  assert.equal(next.pawns[0]!.hp, next.pawns[0]!.maxHp)
  assert.deepEqual(next.tiles, state.tiles)
  assert.deepEqual(next.order, state.order)
  assert.equal(next.randomState, state.randomState)
  assert.deepEqual(
    next.pawns.map((p) => [p.id, p.q, p.r]),
    state.pawns.map((p) => [p.id, p.q, p.r]),
  )
  assert.equal(start.pawns[0]!.kind, 'swordsman')
})

test('Experiment counts special movement and complete rounds at the cap', async () => {
  const start = saveStart(
    field([
      new Lancer(1, 0, 0, 'player'),
      new King(2, -3, -2, 'player'),
      new King(3, 3, 2, 'enemy'),
    ]),
  )
  const bot: Bot = {
    name: 'scripted',
    options: {},
    chooseActions: async (state) =>
      state.order[state.active] === 1
        ? [{ type: 'special', target: { q: 2, r: 0 } }, { type: 'endTurn' }]
        : [{ type: 'endTurn' }],
  }
  const match = await playExperiment(metadata, start, bot, passive, 1)
  assert.equal(match.metrics.winner, null)
  assert.equal(match.metrics.rounds, 1)
  assert.equal(match.telemetry.length, 1)
  assert.equal(match.telemetry[0]!.moves, 1)
  assert.equal(match.units[0]!.moves, 1)
})

test('Area casualties count pawns, not blow events', () => {
  const state = field([
    new Bomber(1, 0, 0, 'player'),
    new King(2, -3, -2, 'player'),
    new King(3, 3, 2, 'enemy'),
    new Swordsman(4, 1, 0, 'enemy', 1),
    new Swordsman(5, 1, -1, 'enemy', 1),
  ])
  const next = reducer(state, { type: 'special', target: { q: 1, r: 0 } })
  assert.equal(roundTelemetry(next, 1, 0, 0, 0).kills, 2)
})

test('A surprise winner has unknown heuristic settling time instead of first-round certainty', () => {
  const state = field([new King(1, 0, 0, 'player'), new King(2, 3, 2, 'enemy')])
  const sample = roundTelemetry(state, 1, 0, 0, 0)
  const metrics = matchMetrics(
    'test',
    'a',
    'b',
    [
      { ...sample, value: 0.2 },
      { ...sample, round: 2, value: 0.3 },
      { ...sample, round: 3, value: 0.5 },
    ],
    { ...state, winner: 'player' },
  )
  assert.equal(metrics.decisionRound, null)
})

test('Support is measured from actual healing, grants and interceptions', async () => {
  const state = field([
    new Bulwark(1, 0, 0, 'player'),
    new King(2, -1, 0, 'player'),
    new Wolf(3, -1, 1, 'enemy'),
    new King(4, 3, 2, 'enemy'),
  ])
  const protect: Bot = {
    name: 'protect',
    options: {},
    chooseActions: async (s) =>
      s.order[s.active] === 1
        ? [{ type: 'special', target: { q: -1, r: 0 } }, { type: 'endTurn' }]
        : [{ type: 'endTurn' }],
  }
  const attack: Bot = {
    name: 'attack',
    options: {},
    chooseActions: async (s) =>
      s.order[s.active] === 3
        ? [{ type: 'special', target: { q: -1, r: 0 } }, { type: 'endTurn' }]
        : [{ type: 'endTurn' }],
  }
  const match = await playExperiment(metadata, saveStart(state), protect, attack, 1)
  assert.equal(match.units[0]!.protections, 1)
  assert.equal(match.units[0]!.interceptedDamage, 2)
  assert.equal(match.units[1]!.damageTaken, 0)
})

test('Paired comparison rejects different starts and reports seed-level deltas', async () => {
  const state = field([new King(1, 0, 0, 'player'), new King(2, 3, 2, 'enemy')])
  const control = await playExperiment(metadata, saveStart(state), passive, passive, 1)
  const candidate: ExperimentMatch = { ...control, hostileDamage: 2 }
  const comparison = pairedComparison([control], [candidate])
  assert.equal(comparison.ordinary.hostileDamage!.delta, 2)
  assert.equal(comparison.ordinary.hostileDamage!.approximate95, null)
  assert.throws(() =>
    pairedComparison(
      [control],
      [
        {
          ...candidate,
          start: { ...control.start, state: { ...control.start.state, randomState: 1 } },
        },
      ],
    ),
  )
})
