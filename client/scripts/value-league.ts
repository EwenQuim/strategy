import { readPipelineConfig } from './value-config.ts'
import { collectValueGames } from './value-dataset.ts'
import { readCheckpoint } from './value-artifacts.ts'
import { fitValueCandidate } from './value-candidate.ts'
import { evaluateValueCandidate } from './value-tournament.ts'
import { BASELINE_WEIGHTS } from '../src/bots/valueModel.ts'
import { LearnedBot } from '../src/bots/strategies/learned.ts'

const [command, ...args] = process.argv.slice(2)
const special = new Map<string, string>()
const pipeline: string[] = []
let resume = false
for (const arg of args) {
  if (arg === '--resume') {
    resume = true
    continue
  }
  const match =
    /^--(minutes|dataset|initial|candidate|reference|challenger|referenceOptions|blend|excludeRandom|lastFraction)=(.+)$/.exec(
      arg,
    )
  if (match) {
    if (special.has(match[1])) throw new Error(`Duplicate option: ${match[1]}`)
    special.set(match[1], match[2])
  } else pipeline.push(arg)
}
const minutes = Number(special.get('minutes') ?? 180)
if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('Invalid --minutes')
const deadline = Date.now() + minutes * 60_000
if (special.has('excludeRandom') && !['true', 'false'].includes(special.get('excludeRandom')!))
  throw new Error('excludeRandom must be true or false')
const config = readPipelineConfig(pipeline)
if (command === 'collect') {
  await collectValueGames(config, resume, deadline, special.get('challenger'))
} else if (command === 'fit') {
  const paths = special.get('dataset')?.split(',')
  if (!paths?.length) throw new Error('fit needs --dataset=<path[,path]>')
  const initial = special.has('initial')
    ? readCheckpoint(special.get('initial')!)
    : BASELINE_WEIGHTS
  const fitted = fitValueCandidate(
    config,
    paths,
    initial,
    resume,
    Number(special.get('blend') ?? 1),
    {
      excludeRandom: special.get('excludeRandom') === 'true',
      lastFraction: Number(special.get('lastFraction') ?? 1),
    },
  )
  console.log(JSON.stringify(fitted, null, 2))
} else if (command === 'evaluate') {
  const candidate = special.get('candidate')
  if (!candidate) throw new Error('evaluate needs --candidate=<checkpoint.json>')
  const referenceOptions = special.has('referenceOptions')
    ? new LearnedBot(JSON.parse(special.get('referenceOptions')!)).options
    : config.evaluation.search
  await evaluateValueCandidate(
    config,
    candidate,
    resume,
    deadline,
    special.get('reference'),
    referenceOptions,
  )
} else {
  throw new Error(
    'Usage: value-league collect|fit|evaluate [--config=...] [--resume] [--minutes=N]',
  )
}
