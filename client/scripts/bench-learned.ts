import { activePawn, reducer } from '../src/lib/engine/index.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { CommanderBot, COMMANDER_LEVELS } from '../src/bots/strategies/commander.ts'
import { LearnedBot } from '../src/bots/strategies/learned.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { trainingBattle } from './learned-matches.ts'

const pairs = Number(process.env.PAIRS ?? 8)
const simulations = Number(process.env.SIMULATIONS ?? 128)
const candidates = Number(process.env.CANDIDATES ?? 16)
const model = process.env.MODEL === 'baseline' ? 'baseline' : 'league-v1'
const opponent = process.env.OPPONENT ?? 'depthsearch'
const backup = process.env.BACKUP === 'minimax' ? 'minimax' : 'average'
const prefix = process.env.PREFIX ?? 'value-benchmark-heldout'
const offset = Number(process.env.OFFSET ?? 0)
const stride = Number(process.env.STRIDE ?? 1)
const legacyBeam = Number(process.env.LEGACY_BEAM ?? 6)
const times: number[] = []
const opponentTimes: number[] = []
let wins = 0,
  losses = 0,
  unfinished = 0
for (let pair = 0; pair < pairs; pair++) {
  for (const side of ['player', 'enemy'] as const) {
    const scenario = pair * stride + offset
    let state = trainingBattle(`${prefix}-${scenario}`, scenario)
    const learned = new LearnedBot({ model, simulations, candidates, backup })
    const legacy =
      opponent === 'commander'
        ? new CommanderBot(COMMANDER_LEVELS.brutal)
        : new DepthsearchBot({ ...BOT_LEVELS.hard, depth: 4, beamWidth: legacyBeam })
    const started = performance.now()
    for (let turn = 0; turn < 360 && !state.winner; turn++) {
      const ours = activePawn(state)!.side === side
      const before = performance.now()
      const actions = await (ours ? learned : legacy).chooseActions(state)
      if (ours) times.push(performance.now() - before)
      else opponentTimes.push(performance.now() - before)
      if (!actions.length) throw new Error('Benchmark bot failed to act')
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
      `${prefix}-${scenario} ${state.biome} ${state.setup!.player.length}v${state.setup!.enemy.length} / learned ${side}: ${state.winner ?? 'timeout'}, round ${state.round}, ${((performance.now() - started) / 1000).toFixed(1)}s`,
    )
  }
}
times.sort((a, b) => a - b)
opponentTimes.sort((a, b) => a - b)
console.log(
  JSON.stringify(
    {
      model,
      simulations,
      candidates,
      opponent,
      backup,
      prefix,
      offset,
      stride,
      legacyBeam,
      pairs,
      wins,
      losses,
      unfinished,
      matchScore: (wins + unfinished * 0.5) / (pairs * 2),
      p95Ms: times[Math.ceil(times.length * 0.95) - 1],
      worstMs: times.at(-1),
      opponentP95Ms: opponentTimes[Math.ceil(opponentTimes.length * 0.95) - 1],
      opponentWorstMs: opponentTimes.at(-1),
    },
    null,
    2,
  ),
)
