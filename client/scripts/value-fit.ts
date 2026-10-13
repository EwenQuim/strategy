import { predictValue } from '../src/bots/valueModel.ts'

export type Sample = { features: number[]; label: number; game: number }
export type FitOptions = {
  epochs: number
  learningRate: number
  regularization: number
  validationEvery: number
}

export function valueLoss(data: readonly Sample[], weights: readonly number[]): number {
  if (!data.length) throw new RangeError('Training and validation need completed game samples')
  return (
    data.reduce((sum, sample) => {
      const p = Math.max(1e-6, Math.min(1 - 1e-6, predictValue(sample.features, weights)))
      return sum - sample.label * Math.log(p) - (1 - sample.label) * Math.log(1 - p)
    }, 0) / data.length
  )
}

// Whole games belong to one split. Full-batch Adam makes fitting reproducible without RNG.
export function fitValue(
  samples: readonly Sample[],
  initial: readonly number[],
  options: FitOptions,
) {
  const train = samples.filter((sample) => sample.game % options.validationEvery !== 0)
  const validation = samples.filter((sample) => sample.game % options.validationEvery === 0)
  valueLoss(train, initial)
  const baselineValidationLoss = valueLoss(validation, initial)
  const weights = [...initial],
    first = initial.map(() => 0),
    second = initial.map(() => 0)
  let best = [...weights],
    bestLoss = baselineValidationLoss,
    bestEpoch = 0
  for (let epoch = 1; epoch <= options.epochs; epoch++) {
    const gradient = initial.map(() => 0)
    for (const sample of train) {
      const error = predictValue(sample.features, weights) - sample.label
      for (let feature = 0; feature < weights.length; feature++)
        gradient[feature] += (error * sample.features[feature]) / train.length
    }
    for (let feature = 0; feature < weights.length; feature++) {
      const g = gradient[feature] + options.regularization * weights[feature]
      first[feature] = 0.9 * first[feature] + 0.1 * g
      second[feature] = 0.999 * second[feature] + 0.001 * g * g
      weights[feature] -=
        (options.learningRate * (first[feature] / (1 - 0.9 ** epoch))) /
        (Math.sqrt(second[feature] / (1 - 0.999 ** epoch)) + 1e-8)
    }
    const heldout = valueLoss(validation, weights)
    if (heldout < bestLoss) {
      bestLoss = heldout
      best = [...weights]
      bestEpoch = epoch
    }
  }
  // Report the persisted weights, not the higher-precision in-memory precursor.
  const rounded = best.map((weight) => Number(weight.toFixed(6)))
  return {
    weights: rounded,
    baselineValidationLoss,
    validationLoss: valueLoss(validation, rounded),
    bestEpoch,
    trainingSamples: train.length,
    validationSamples: validation.length,
  }
}
