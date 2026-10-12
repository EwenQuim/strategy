import { writeFileSync } from 'node:fs'
import { activePawn, reducer } from '../src/lib/engine/index.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { CommanderBot, COMMANDER_LEVELS } from '../src/bots/strategies/commander.ts'
import { RandomBot } from '../src/bots/strategies/random.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { valueFeatures, VALUE_FEATURES } from '../src/bots/valueFeatures.ts'
import { BASELINE_WEIGHTS } from '../src/bots/valueModel.ts'
import { trainingBattle } from './learned-matches.ts'
import { fitValue, type Sample } from './value-fit.ts'

const games = Number(process.env.GAMES ?? 80)
const epochs = Number(process.env.EPOCHS ?? 400)
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
const fitted = fitValue(samples, BASELINE_WEIGHTS, {
  epochs,
  learningRate: 0.03,
  regularization: 0.001,
  validationEvery: 5,
})
const report = {
  version: 1,
  trainingGames: games,
  completedGames: completed,
  positions: samples.length,
  features: VALUE_FEATURES,
  trainingPrefix: 'value-training-v1-',
  ...fitted,
}
writeFileSync(
  new URL('../src/bots/value-model.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
)
console.log(JSON.stringify(report, null, 2))
