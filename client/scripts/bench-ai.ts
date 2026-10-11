import { CAMPAIGNS } from '../src/lib/campaign.ts'
import { activePawn, initialState, reducer, type GameState } from '../src/lib/engine/index.ts'
import { victoryActions } from '../tests/campaign-replays.ts'
import { DepthsearchBot, searchStats } from '../src/bots/strategies/depthsearch.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'

// Compare identical opening and contact positions, rather than timing different games at each depth.
const positions: GameState[] = []
for (const [slug, id] of [
  ['original', 5],
  ['iron-throne', 8],
  ['war-of-the-ring', 6],
  ['iron-throne', 5],
  ['brutal', 19],
  ['brutal', 20],
] as const) {
  const level = CAMPAIGNS.find((pack) => pack.slug === slug)!.levels[id - 1]
  let state = initialState(level.seed, level.setup, 'player')
  let captured = 0
  let previousActivation = ''
  for (const action of victoryActions(level)) {
    const activation = `${state.round}:${activePawn(state)?.id}`
    if (
      activation !== previousActivation &&
      activePawn(state)?.side === 'enemy' &&
      captured < 5
    ) {
      positions.push(state)
      captured++
    }
    previousActivation = activation
    state = reducer(state, action)
  }
}
// Include the full-size generated battlefield and armies, not only compact campaigns.
for (const seed of ['alpha', 'bravo', 'charlie']) {
  const state = initialState(seed)
  for (const active of [0, 1, 2]) positions.push({ ...state, active })
}

for (const depth of [2, 3, 4] as const) {
  const bot = new DepthsearchBot({ ...BOT_LEVELS.hard, depth })
  await bot.chooseActions(positions[0])
  const times: number[] = []
  let budgetBreaks = 0
  for (const state of positions) {
    const started = performance.now()
    await bot.chooseActions(state)
    times.push(performance.now() - started)
    budgetBreaks += Number(searchStats.budgetBreaks > 0)
  }
  times.sort((a, b) => a - b)
  console.log(
    `depth ${depth}: ${times.length} positions, mean ${(times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(1)} ms, p95 ${times[Math.ceil(times.length * 0.95) - 1].toFixed(1)} ms, worst ${times.at(-1)!.toFixed(1)} ms; budget reached ${budgetBreaks} times`,
  )
}
