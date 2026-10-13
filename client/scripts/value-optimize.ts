import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readPipelineConfig } from './value-config.ts'
import { digest, openRun, readCheckpoint, readJson, writeJson } from './value-artifacts.ts'
import { evaluateValueCandidate } from './value-tournament.ts'
import { VALUE_FEATURES } from '../src/bots/valueFeatures.ts'

// Outcome-based evolution complements outcome-prediction fitting. Every mutation is archived;
// screening uses a fixed opponent and common seeds, not lower loss as a proxy for playing strength.
const args = process.argv.slice(2)
const flags = new Map<string, string>()
const pipeline: string[] = []
for (const arg of args) {
  const match = /^--(initial|reference|generations|population|sigma|minutes|seed)=(.+)$/.exec(
    arg,
  )
  if (match) {
    if (flags.has(match[1])) throw new Error('Duplicate optimizer option')
    flags.set(match[1], match[2])
  } else if (arg !== '--resume') pipeline.push(arg)
}
const config = readPipelineConfig(pipeline)
const initialPath = flags.get('initial')
if (!initialPath) throw new Error('Use --initial=<checkpoint.json>')
const initial = readCheckpoint(initialPath)
const referencePath = flags.get('reference') ?? initialPath
const reference = readCheckpoint(referencePath)
const generations = Number(flags.get('generations') ?? 3)
const population = Number(flags.get('population') ?? 8)
const sigma = Number(flags.get('sigma') ?? 0.3)
const minutes = Number(flags.get('minutes') ?? 45)
if (
  !Number.isSafeInteger(generations) ||
  generations < 1 ||
  !Number.isSafeInteger(population) ||
  population < 2 ||
  !Number.isFinite(sigma) ||
  sigma <= 0 ||
  !Number.isFinite(minutes) ||
  minutes <= 0
)
  throw new Error('Invalid optimizer budget')
const deadline = Date.now() + minutes * 60_000
const seed = flags.get('seed') ?? 'value-evolution-v1'
const directory = openRun(
  config.output,
  'optimize',
  { config, initial, reference, generations, population, sigma, seed },
  args.includes('--resume'),
)
let champion = [...initial]
const historyPath = join(directory, 'history.json')
const history = existsSync(historyPath)
  ? readJson<
      {
        generation: number
        member: number
        fitness: number
        report: Awaited<ReturnType<typeof evaluateValueCandidate>>
      }[]
    >(historyPath)
  : []
let globalBest = history.reduce((best, entry) => Math.max(best, entry.fitness), -Infinity)
for (let generation = 0; generation < generations && Date.now() < deadline; generation++) {
  const generationPath = join(directory, `generation-${generation}.json`)
  if (existsSync(generationPath)) {
    champion = [...readCheckpoint(generationPath)]
    continue
  }
  let bestScore = -Infinity
  let best = [...champion]
  let evaluated = 0
  for (let member = 0; member < population && Date.now() < deadline; member++) {
    const path = join(directory, `candidate-${generation}-${member}.json`)
    const weights = existsSync(path)
      ? readCheckpoint(path)
      : champion.map((weight, feature) => {
          if (member === 0) return weight
          const hash = digest([seed, generation, member, feature])
          const u = (Number.parseInt(hash.slice(0, 8), 16) + 1) / (2 ** 32 + 1)
          const v = (Number.parseInt(hash.slice(8, 16), 16) + 1) / (2 ** 32 + 1)
          const noise = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
          return Number(
            (weight + noise * sigma * Math.max(0.5, Math.abs(initial[feature]))).toFixed(6),
          )
        })
    if (!existsSync(path))
      writeJson(path, { version: 1, features: [...VALUE_FEATURES], weights })
    const evaluation = structuredClone(config)
    evaluation.output = join(directory, `evaluation-${generation}-${member}`)
    evaluation.evaluation.includeIncumbent = true
    evaluation.evaluation.seedPrefix = `${config.evaluation.seedPrefix}-generation-${generation}`
    const report = await evaluateValueCandidate(
      evaluation,
      path,
      existsSync(evaluation.output),
      deadline,
      referencePath,
    )
    if (!report.complete) break
    const incumbent = report.results.find((result) => result.opponent === 'incumbent')!
    // Wins are rewarded, losses penalized, censoring neutral. Rank also rewards completion
    // through wins rather than assigning unproven draws to stalled battles.
    const score = (incumbent.wins - incumbent.losses) / incumbent.games
    const entry = { generation, member, fitness: score, report }
    const previous = history.findIndex(
      (item) => item.generation === generation && item.member === member,
    )
    if (previous < 0) history.push(entry)
    else history[previous] = entry
    evaluated++
    if (score > bestScore) {
      bestScore = score
      best = [...weights]
    }
    if (score > globalBest) {
      globalBest = score
      writeJson(join(directory, 'best.json'), {
        version: 1,
        features: [...VALUE_FEATURES],
        weights,
        generation,
        member,
        fitness: score,
      })
    }
    writeJson(historyPath, history)
    console.log(
      `Evolution ${generation}/${member}: ${incumbent.wins}-${incumbent.losses}-${incumbent.timeouts}, fitness ${score.toFixed(3)}`,
    )
  }
  // An interrupted generation must remain resumable; never seal it with a partial winner.
  if (evaluated === population) {
    champion = best
    writeJson(generationPath, {
      version: 1,
      features: [...VALUE_FEATURES],
      weights: champion,
      fitness: bestScore,
    })
  } else break
}
