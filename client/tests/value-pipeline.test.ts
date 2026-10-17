import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readPipelineConfig } from '../scripts/value-config.ts'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fitValue } from '../scripts/value-fit.ts'
import { acceptanceFailures } from '../scripts/value-pipeline.ts'
import { HannibalBot } from '../src/bots/strategies/hannibal.ts'

test('Retraining overrides are typed, independent and reject unknown fields before starting work', () => {
  const config = readPipelineConfig([
    '--training.games=10',
    '--training.epochs=2',
    '--training.learningRate=0.1',
    '--evaluation.search.simulations=4',
    '--evaluation.includeIncumbent=false',
    '--output=training-runs/example',
  ])
  assert.equal(config.training.games, 10)
  assert.equal(config.evaluation.search.simulations, 4)
  assert.equal(config.evaluation.includeIncumbent, false)
  assert.equal(readPipelineConfig([]).training.games, 80)
  for (const args of [
    ['--training.games=0'],
    ['--training.unknown=1'],
    ['--evaluation.search.simulations=0'],
    ['--acceptance.minScore=2'],
    ['--training.seedPrefix=same', '--evaluation.seedPrefix=same'],
    ['--training.learningRate=oops'],
  ])
    assert.throws(() => readPipelineConfig(args))
})

test('JSON config replaces scenario and opponent lists without modifying later runs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'value-config-'))
  const path = join(directory, 'config.json')
  try {
    writeFileSync(
      path,
      JSON.stringify({
        scenarios: { rosters: [['king', 'ninja']], biomes: ['hell'] },
        training: { league: [{ name: 'random', options: {} }] },
        evaluation: { opponents: [{ name: 'depthsearch', options: { depth: 4 } }] },
      }),
    )
    const config = readPipelineConfig([`--config=${path}`])
    assert.deepEqual(config.scenarios.rosters, [['king', 'ninja']])
    assert.equal(config.training.league[0].name, 'random')
    config.scenarios.rosters[0].push('king')
    assert.deepEqual(readPipelineConfig([]).scenarios.rosters[0], [
      'king',
      'swordsman',
      'archer',
    ])
    writeFileSync(
      path,
      JSON.stringify({ training: { league: [{ name: 'missing', options: {} }] } }),
    )
    assert.throws(() => readPipelineConfig([`--config=${path}`]))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Whole-game fitting improves observable held-out predictions without mutating initial weights', () => {
  const samples = Array.from({ length: 20 }, (_, game) => ({
    game,
    features: [game % 2 ? 1 : -1],
    label: game % 2 ? 1 : 0,
  }))
  const initial = [0]
  const fitted = fitValue(samples, initial, {
    epochs: 50,
    learningRate: 0.1,
    regularization: 0.001,
    validationEvery: 5,
  })
  assert.ok(fitted.weights[0] > 0)
  assert.ok(fitted.validationLoss < fitted.baselineValidationLoss)
  assert.equal(fitted.trainingSamples, 16)
  assert.equal(fitted.validationSamples, 4)
  assert.deepEqual(initial, [0])
  assert.throws(() =>
    fitValue([], initial, {
      epochs: 1,
      learningRate: 0.1,
      regularization: 0,
      validationEvery: 5,
    }),
  )
})

test('Candidate acceptance needs predictive improvement, match strength, completion and bounded latency', () => {
  const config = readPipelineConfig([])
  const candidate = { validationLoss: 0.3, baselineValidationLoss: 0.4 }
  const result = { opponent: 'depthsearch', score: 0.8, timeoutRate: 0.1, p95Ms: 100 }
  assert.deepEqual(acceptanceFailures(config, candidate, [result]), [])
  assert.deepEqual(
    acceptanceFailures(config, candidate, [{ ...result, opponent: 'incumbent', score: 0.5 }]),
    [],
  )
  for (const changed of [
    { ...result, score: 0.5 },
    { ...result, timeoutRate: 0.5 },
    { ...result, p95Ms: 1000 },
  ])
    assert.ok(acceptanceFailures(config, candidate, [changed]).length)
  assert.ok(acceptanceFailures(config, candidate, []).length)
  assert.ok(acceptanceFailures(config, { ...candidate, validationLoss: 0.5 }, [result]).length)
})

test('Candidate weights are validated and copied into an independent bot', () => {
  assert.throws(() => new HannibalBot({}, [NaN]), RangeError)
  assert.throws(() => new HannibalBot({}, [1]), RangeError)
})
