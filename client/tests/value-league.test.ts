import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validationGame } from '../scripts/value-dataset.ts'
import { tournamentSummary } from '../scripts/value-tournament.ts'
import { readPipelineConfig } from '../scripts/value-config.ts'
import { mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectValueGames, loadValueSamples } from '../scripts/value-dataset.ts'
import { readJson, writeJson, trainingProvenance } from '../scripts/value-artifacts.ts'
import { fitValueCandidate } from '../scripts/value-candidate.ts'
import { VALUE_FEATURES } from '../src/bots/valueFeatures.ts'
import { valueLoss } from '../scripts/value-fit.ts'

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

test('Collection resumes without replacing completed games and rejects changed rules settings', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'league-resume-'))
  try {
    const config = readPipelineConfig([
      '--training.games=6',
      '--training.maxActivations=1',
      '--training.validationEvery=2',
    ])
    config.output = join(directory, 'data')
    config.training.league = [{ name: 'random', options: {} }]
    await collectValueGames(config, false, Date.now() + 10_000)
    const files = readdirSync(config.output).filter((name) => name.startsWith('game-'))
    assert.equal(files.length, 6)
    const before = files.map((name) => readJson(join(config.output, name)))
    await collectValueGames(config, true, Date.now() + 10_000)
    assert.deepEqual(
      files.map((name) => readJson(join(config.output, name))),
      before,
    )
    const data = loadValueSamples([config.output], 2)
    assert.equal(data.timeouts, 6)
    assert.equal(data.samples.length, 0)
    await assert.rejects(
      collectValueGames(
        { ...config, training: { ...config.training, games: 8 } },
        true,
        Date.now() + 1000,
      ),
      /Resume rejected/,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Persisted blended candidates report their own held-out loss and keep paired seeds in one split', () => {
  const directory = mkdtempSync(join(tmpdir(), 'league-fitting-'))
  try {
    writeJson(join(directory, 'manifest.json'), {
      kind: 'dataset',
      settings: {},
      provenance: trainingProvenance(),
    })
    for (let game = 0; game < 40; game++) {
      const value = Math.floor(game / 2) % 2 ? 1 : -1
      writeJson(join(directory, `game-${String(game).padStart(6, '0')}.json`), {
        game,
        seed: `fit-pair-${Math.floor(game / 2)}`,
        scenario: Math.floor(game / 2),
        players: [
          { name: 'learned', options: {} },
          { name: 'commander', options: {} },
        ],
        winner: value > 0 ? 'player' : 'enemy',
        positions: [VALUE_FEATURES.map((_, index) => (index === 0 ? value : 0))],
        elapsedMs: 1,
      })
    }
    const config = readPipelineConfig(['--training.epochs=20', '--training.learningRate=0.1'])
    config.output = join(directory, 'fit')
    const initial = VALUE_FEATURES.map(() => 0)
    const candidate = fitValueCandidate(config, [directory], initial, false, 0.25)
    const data = loadValueSamples([directory], 5)
    const heldout = data.samples.filter((sample) => sample.game % 5 === 0)
    assert.ok(heldout.length > 0 && heldout.length < data.samples.length)
    assert.equal(candidate.validationLoss, valueLoss(heldout, candidate.weights))
    assert.deepEqual(
      readJson<{ weights: number[] }>(join(config.output, 'candidate.json')).weights,
      candidate.weights,
    )
    for (let i = 0; i < data.samples.length; i += 2)
      assert.equal(data.samples[i].game, data.samples[i + 1].game)
    assert.deepEqual(
      initial,
      VALUE_FEATURES.map(() => 0),
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
