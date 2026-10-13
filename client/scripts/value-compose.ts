import { existsSync } from 'node:fs'
import { readCheckpoint, writeJson, digest } from './value-artifacts.ts'
import { VALUE_FEATURES } from '../src/bots/valueFeatures.ts'

// Explicit feature-group transfer keeps tactical calibration while testing newly fitted
// strategic weights. This creates a candidate, never modifies a registered checkpoint.
const flags = new Map<string, string>()
for (const arg of process.argv.slice(2)) {
  const match = /^--(base|source|features|blend|output)=(.+)$/.exec(arg)
  if (!match || flags.has(match[1])) throw new Error('Invalid or duplicate composition option')
  flags.set(match[1], match[2])
}
const basePath = flags.get('base'),
  sourcePath = flags.get('source'),
  output = flags.get('output')
if (!basePath || !sourcePath || !output) throw new Error('Use --base, --source and --output')
if (existsSync(output)) throw new Error('Composition output already exists; use a fresh path')
const base = readCheckpoint(basePath),
  source = readCheckpoint(sourcePath)
const blend = Number(flags.get('blend') ?? 1)
if (!Number.isFinite(blend) || blend < 0 || blend > 1) throw new Error('Invalid blend')
const selected = flags.get('features')?.split(',') ?? [...VALUE_FEATURES]
if (selected.some((feature) => !VALUE_FEATURES.includes(feature)))
  throw new Error('Unknown feature')
const weights = base.map((weight, index) =>
  selected.includes(VALUE_FEATURES[index])
    ? Number((weight * (1 - blend) + source[index] * blend).toFixed(6))
    : weight,
)
writeJson(output, {
  version: 1,
  features: [...VALUE_FEATURES],
  weights,
  composition: { baseSha256: digest(base), sourceSha256: digest(source), selected, blend },
})
