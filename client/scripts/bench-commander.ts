import { CommanderBot, COMMANDER_LEVELS } from '../src/bots/strategies/commander.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import {
  activePawn,
  initialState,
  reducer,
  symmetricSeed,
  type Side,
} from '../src/lib/engine/index.ts'

const seeds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot']
let wins = 0,
  losses = 0,
  unfinished = 0
const times: number[] = []
for (const seed of seeds) {
  for (const side of ['player', 'enemy'] as const) {
    let state = initialState(
      symmetricSeed(seed),
      {
        biome: 'desert',
        player: ['king', 'swordsman', 'archer', 'ninja', 'lancer'],
        enemy: ['king', 'swordsman', 'archer', 'ninja', 'lancer'],
      },
      'player',
    )
    const commander = new CommanderBot(COMMANDER_LEVELS.brutal)
    const legacy = new DepthsearchBot({ ...BOT_LEVELS.hard, depth: 4 })
    for (let turn = 0; turn < 240 && !state.winner; turn++) {
      const acting: Side = activePawn(state)!.side
      const start = performance.now()
      const actions = await (acting === side ? commander : legacy).chooseActions(state)
      if (acting === side) times.push(performance.now() - start)
      for (const action of actions) {
        const next = reducer(state, action)
        if (next === state) throw new Error('Illegal benchmark action')
        state = next
      }
    }
    if (state.winner === side) wins++
    else if (state.winner && state.winner !== 'draw') losses++
    else unfinished++
    console.log(
      `${seed} / Commander ${side}: ${state.winner ?? 'unfinished'}, round ${state.round}`,
    )
  }
}
times.sort((a, b) => a - b)
console.log(
  `Commander Brutal vs depth-four Hard: ${wins} wins, ${losses} losses, ${unfinished} draws/unfinished`,
)
console.log(
  `Decisions: p95 ${times[Math.ceil(times.length * 0.95) - 1].toFixed(1)} ms, worst ${times.at(-1)!.toFixed(1)} ms`,
)
