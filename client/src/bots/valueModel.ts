import trained from './value-model.json' with { type: 'json' }
import retrained from './value-model-v2.json' with { type: 'json' }
import { VALUE_FEATURES } from './valueFeatures.ts'

// A compact logistic value model: outcome-trained weights, no runtime ML dependency.
export const BASELINE_WEIGHTS = [
  3,
  -2,
  2,
  0.5,
  -4,
  -1,
  -2,
  -8,
  1,
  2,
  1.5,
  0.1,
  0.3,
  0.2,
  0.2,
  0.2,
  -1,
  ...Array(VALUE_FEATURES.length - 17).fill(0),
]

export const VALUE_MODELS = {
  baseline: BASELINE_WEIGHTS,
  'league-v1': trained.weights,
  'league-v2': retrained.weights,
} as const

for (const model of [trained, retrained]) {
  if (
    model.weights.length !== VALUE_FEATURES.length ||
    model.features.some((feature, index) => feature !== VALUE_FEATURES[index]) ||
    model.weights.some((weight) => !Number.isFinite(weight))
  )
    throw new Error('Learned value model does not match the feature contract')
}

export function predictValue(features: readonly number[], weights: readonly number[]): number {
  const logit = features.reduce((sum, value, index) => sum + value * weights[index], 0)
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, logit))))
}
