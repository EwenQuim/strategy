import { join } from 'node:path'
import { readPipelineConfig } from './value-config.ts'
import { collectValueGames, loadValueSamples } from './value-dataset.ts'
import {
  digest,
  openRun,
  readCheckpoint,
  trainingProvenance,
  writeJson,
} from './value-artifacts.ts'
import { fitValue } from './value-fit.ts'
import { evaluateValueCandidate } from './value-tournament.ts'
import { VALUE_FEATURES } from '../src/bots/valueFeatures.ts'
import { BASELINE_WEIGHTS } from '../src/bots/valueModel.ts'

const [command, ...args] = process.argv.slice(2)
const special = new Map<string, string>()
const pipeline: string[] = []
let resume = false
for (const arg of args) {
  if (arg === '--resume') {
    resume = true
    continue
  }
  const match = /^--(minutes|dataset|initial|candidate|reference|challenger)=(.+)$/.exec(arg)
  if (match) {
    if (special.has(match[1])) throw new Error(`Duplicate option: ${match[1]}`)
    special.set(match[1], match[2])
  } else pipeline.push(arg)
}
const minutes = Number(special.get('minutes') ?? 180)
if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('Invalid --minutes')
const deadline = Date.now() + minutes * 60_000
const config = readPipelineConfig(pipeline)
if (command === 'collect') {
  await collectValueGames(config, resume, deadline, special.get('challenger'))
} else if (command === 'fit') {
  const paths = special.get('dataset')?.split(',')
  if (!paths?.length) throw new Error('fit needs --dataset=<path[,path]>')
  const data = loadValueSamples(paths, config.training.validationEvery)
  if (data.sources[0].provenance.rulesAndBotsSha256 !== trainingProvenance().rulesAndBotsSha256)
    throw new Error('Dataset rules or bots differ from the current checkout')
  const initial = special.has('initial')
    ? readCheckpoint(special.get('initial')!)
    : BASELINE_WEIGHTS
  const settings = {
    sources: data.sources,
    sampleDigest: digest(data.samples),
    initial,
    fit: config.training,
  }
  const directory = openRun(config.output, 'fit', settings, resume)
  const fitted = fitValue(data.samples, initial, config.training)
  writeJson(join(directory, 'candidate.json'), {
    version: 1,
    features: [...VALUE_FEATURES],
    ...fitted,
    completedGames: data.completed,
    timeouts: data.timeouts,
    positions: data.samples.length,
    provenance: trainingProvenance(),
  })
  console.log(JSON.stringify(fitted, null, 2))
} else if (command === 'evaluate') {
  const candidate = special.get('candidate')
  if (!candidate) throw new Error('evaluate needs --candidate=<checkpoint.json>')
  await evaluateValueCandidate(config, candidate, resume, deadline, special.get('reference'))
} else {
  throw new Error(
    'Usage: value-league collect|fit|evaluate [--config=...] [--resume] [--minutes=N]',
  )
}
