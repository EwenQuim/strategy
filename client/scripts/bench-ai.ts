import { CAMPAIGNS } from '../src/campaign.ts'
import { activePawn, initialState, reducer, type GameState } from '../src/lib/engine/index.ts'
import { victoryActions } from '../tests/campaign-replays.ts'
import { DepthsearchBot, searchStats } from '../src/bots/strategies/depthsearch.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'

// Compare identical opening and contact positions, rather than timing different games at each depth.
const positions: GameState[] = []
const generatedOnly = process.argv.includes('--generated')
const beamWidth = Number(
  process.argv.find((arg) => arg.startsWith('--beam-width='))?.split('=')[1] ??
    BOT_LEVELS.hard.beamWidth,
)
for (const [slug, id] of generatedOnly
  ? []
  : ([
      ['original', 5],
      ['iron-throne', 8],
      ['war-of-the-ring', 6],
      ['iron-throne', 5],
      ['brutal', 19],
      ['brutal', 20],
    ] as const)) {
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
if (generatedOnly)
  for (const seed of ['contact-a', 'contact-b', 'contact-c']) {
    const state = initialState(seed, {
      biome: 'verdant',
      map: ['__....__', '_......_', '........', '........', '........', '_......_', '__....__'],
      player: [
        { kind: 'king', col: 3, row: 5 },
        { kind: 'swordsman', col: 2, row: 4 },
        { kind: 'archer', col: 4, row: 5 },
        { kind: 'ninja', col: 4, row: 4 },
        { kind: 'lancer', col: 3, row: 4 },
      ],
      enemy: [
        { kind: 'king', col: 3, row: 1 },
        { kind: 'swordsman', col: 2, row: 2 },
        { kind: 'archer', col: 4, row: 1 },
        { kind: 'magician', col: 4, row: 2 },
        { kind: 'bulwark', col: 3, row: 2 },
      ],
    })
    for (const active of [0, 1, 2]) positions.push({ ...state, active })
  }

for (const depth of [2, 3, 4] as const) {
  const bot = new DepthsearchBot({ ...BOT_LEVELS.hard, depth, beamWidth })
  for (const state of positions) await bot.chooseActions(state)
  const times: number[] = []
  let budgetBreaks = 0
  const totals = {
    plansEnumerated: 0,
    leafEvals: 0,
    beamExpansions: 0,
    cutoffs: 0,
  }
  for (const state of positions) {
    const started = performance.now()
    await bot.chooseActions(state)
    times.push(performance.now() - started)
    budgetBreaks += Number(searchStats.budgetBreaks > 0)
    for (const key of Object.keys(totals) as (keyof typeof totals)[])
      totals[key] += searchStats[key]
  }
  times.sort((a, b) => a - b)
  console.log(
    `depth ${depth}, beam ${beamWidth}: ${times.length} positions, mean ${(times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(1)} ms, p95 ${times[Math.ceil(times.length * 0.95) - 1].toFixed(1)} ms, worst ${times.at(-1)!.toFixed(1)} ms; budget reached ${budgetBreaks} times`,
  )
  console.log(
    `  ${totals.plansEnumerated} plans generated, ${totals.leafEvals} evaluations, ${totals.beamExpansions} beam expansions, ${totals.cutoffs} cutoffs`,
  )
}
