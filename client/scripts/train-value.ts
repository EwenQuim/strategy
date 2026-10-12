import { writeFileSync } from 'node:fs'
import { activePawn, reducer } from '../src/lib/engine/index.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { CommanderBot, COMMANDER_LEVELS } from '../src/bots/strategies/commander.ts'
import { RandomBot } from '../src/bots/strategies/random.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { valueFeatures, VALUE_FEATURES } from '../src/bots/valueFeatures.ts'
import { BASELINE_WEIGHTS, predictValue } from '../src/bots/valueModel.ts'
import { trainingBattle } from './learned-matches.ts'

const games = Number(process.env.GAMES ?? 80)
const epochs = Number(process.env.EPOCHS ?? 400)
type Sample = { features: number[]; label: number; game: number }
const samples: Sample[] = []
const league = [
  new DepthsearchBot(BOT_LEVELS.easy),
  new DepthsearchBot(BOT_LEVELS.normal),
  new DepthsearchBot(BOT_LEVELS.hard),
  new CommanderBot(COMMANDER_LEVELS.normal),
  new RandomBot(),
]
let completed = 0
for (let game = 0; game < games; game++) {
  let state = trainingBattle(`value-training-v1-${game}`, game)
  const positions: number[][] = []
  const cache = { reach: new Map() }
  const player = league[game % league.length]
  const enemy = league[(Math.floor(game / league.length) + game + 1) % league.length]
  for (let turn = 0; turn < 180 && !state.winner; turn++) {
    positions.push(valueFeatures(state, 'player', cache))
    const actions = await (activePawn(state)!.side === 'player' ? player : enemy).chooseActions(
      state,
    )
    if (!actions.length) throw new Error('Training bot failed to act')
    for (const action of actions) {
      const next = reducer(state, action)
      if (next === state) throw new Error('Illegal training action')
      state = next
    }
  }
  if (state.winner && state.winner !== 'draw') completed++
  const label =
    !state.winner || state.winner === 'draw' ? 0.5 : state.winner === 'player' ? 1 : 0
  for (const features of positions) samples.push({ features, label, game })
  console.log(
    `Training game ${game + 1}/${games}: ${state.winner ?? 'timeout'}, ${positions.length} positions`,
  )
}
// Validation split is by entire game, never randomly by neighbouring states.
const train = samples.filter((sample) => sample.game % 5 !== 0)
const validation = samples.filter((sample) => sample.game % 5 === 0)
const weights = [...BASELINE_WEIGHTS]
const first = weights.map(() => 0),
  second = weights.map(() => 0)
function loss(data: Sample[], parameters: number[]): number {
  return (
    data.reduce((sum, sample) => {
      const p = Math.max(1e-6, Math.min(1 - 1e-6, predictValue(sample.features, parameters)))
      return sum - sample.label * Math.log(p) - (1 - sample.label) * Math.log(1 - p)
    }, 0) / data.length
  )
}
let best = [...weights],
  bestLoss = loss(validation, best)
for (let epoch = 1; epoch <= epochs; epoch++) {
  const gradient = weights.map(() => 0)
  for (const sample of train) {
    const error = predictValue(sample.features, weights) - sample.label
    for (let feature = 0; feature < weights.length; feature++)
      gradient[feature] += (error * sample.features[feature]) / train.length
  }
  for (let feature = 0; feature < weights.length; feature++) {
    const g = gradient[feature] + 0.001 * weights[feature]
    first[feature] = 0.9 * first[feature] + 0.1 * g
    second[feature] = 0.999 * second[feature] + 0.001 * g * g
    weights[feature] -=
      (0.03 * (first[feature] / (1 - 0.9 ** epoch))) /
      (Math.sqrt(second[feature] / (1 - 0.999 ** epoch)) + 1e-8)
  }
  const heldout = loss(validation, weights)
  if (heldout < bestLoss) {
    bestLoss = heldout
    best = [...weights]
  }
}
const report = {
  version: 1,
  trainingGames: games,
  completedGames: completed,
  positions: samples.length,
  features: VALUE_FEATURES,
  trainingPrefix: 'value-training-v1-',
  baselineValidationLoss: loss(validation, BASELINE_WEIGHTS),
  validationLoss: bestLoss,
  weights: best.map((weight) => Number(weight.toFixed(6))),
}
writeFileSync(
  new URL('../src/bots/value-model.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
)
console.log(JSON.stringify(report, null, 2))
