import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validationGame } from '../scripts/value-dataset.ts'
import { tournamentSummary } from '../scripts/value-tournament.ts'
import { readPipelineConfig } from '../scripts/value-config.ts'

test('League example resolves every bot and covers all scenario indices', () => {
  const config = readPipelineConfig(['--config=scripts/value-league.example.json'])
  assert.equal(config.evaluation.stride, 1)
  assert.ok(config.training.league.some((bot) => bot.name === 'learned'))
  assert.ok(config.scenarios.biomes.includes('hell'))
  assert.ok(config.scenarios.rosters.some((roster) => roster.includes('berserker')))
})

test('Paired-seed validation includes multiple league slots rather than one periodic opponent', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => `split-test-${i}`)
  const heldout = seeds.map((seed) => validationGame(seed, 5))
  assert.ok(heldout.some(Boolean) && heldout.some((value) => !value))
  assert.deepEqual(
    heldout,
    seeds.map((seed) => validationGame(seed, 5)),
  )
  const slots = new Set(seeds.flatMap((_, i) => (heldout[i] ? [i % 5] : [])))
  assert.equal(slots.size, 5)
})

test('Tournament reports censored games separately with zero credit and independent paired uncertainty', () => {
  const base = {
    opponent: 'incumbent',
    activations: 5,
    round: 2,
    elapsedMs: 10,
    candidateTimes: [1, 2],
    opponentTimes: [3, 4],
  }
  const report = tournamentSummary([
    { ...base, scenario: 0, side: 'player', winner: 'player' },
    { ...base, scenario: 0, side: 'enemy', winner: 'enemy' },
    { ...base, scenario: 1, side: 'player', winner: null },
    { ...base, scenario: 1, side: 'enemy', winner: 'player' },
  ])
  assert.equal(report.wins, 2)
  assert.equal(report.losses, 1)
  assert.equal(report.timeouts, 1)
  assert.equal(report.score, 0.5)
  assert.equal(report.completedPairs, 2)
  assert.equal(report.timeoutRate, 0.25)
  assert.equal(report.p95Ms, 2)
  assert.equal(report.opponentP95Ms, 4)
})
