import { join } from 'node:path'
import type { PipelineConfig } from './value-config.ts'
import { loadValueSamples } from './value-dataset.ts'
import { digest, openRun, trainingProvenance, writeJson } from './value-artifacts.ts'
import { fitValue, valueLoss } from './value-fit.ts'
import { VALUE_FEATURES } from '../src/bots/valueFeatures.ts'

export function fitValueCandidate(
  config: PipelineConfig,
  paths: readonly string[],
  initial: readonly number[],
  resume = false,
  blend = 1,
  selection: { excludeRandom?: boolean; lastFraction?: number } = {},
) {
  if (!Number.isFinite(blend) || blend < 0 || blend > 1)
    throw new Error('Blend must be between 0 and 1')
  const data = loadValueSamples(paths, config.training.validationEvery, selection)
  if (data.sources[0].provenance.rulesAndBotsSha256 !== trainingProvenance().rulesAndBotsSha256)
    throw new Error('Dataset rules or bots differ from the current checkout')
  const settings = {
    sources: data.sources,
    sampleDigest: digest(data.samples),
    initial,
    fit: config.training,
    blend,
    selection,
  }
  const directory = openRun(config.output, 'fit', settings, resume)
  const fitted = fitValue(data.samples, initial, config.training)
  const weights = fitted.weights.map((weight, index) =>
    Number((initial[index] * (1 - blend) + weight * blend).toFixed(6)),
  )
  const candidate = {
    version: 1,
    features: [...VALUE_FEATURES],
    ...fitted,
    weights,
    validationLoss: valueLoss(
      data.samples.filter((sample) => sample.game % config.training.validationEvery === 0),
      weights,
    ),
    completedGames: data.completed,
    timeouts: data.timeouts,
    positions: data.samples.length,
    provenance: trainingProvenance(),
  }
  writeJson(join(directory, 'candidate.json'), candidate)
  return candidate
}
