import { readFileSync } from 'node:fs'
import {
  activePawn,
  initialState,
  reducer,
  symmetricSeed,
  type BattleSetup,
  type GameState,
  type Side,
} from '../src/lib/engine/index.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import type { Bot } from '../src/bots/bot.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { NapoleonBot, NAPOLEON_LEVELS } from '../src/bots/strategies/napoleon.ts'
import { HannibalBot } from '../src/bots/strategies/hannibal.ts'
import { RandomBot } from '../src/bots/strategies/random.ts'
import { TurtleBot } from './turtle-bot.ts'
import {
  gateFailures,
  matchMetrics,
  nearestEnemyDistance,
  roundTelemetry,
  summarize,
  type MatchMetrics,
  type PopulationReport,
} from './gameplay-metrics.ts'

// Gameplay benchmark: round-robin bot-vs-bot matches over a population of strategies, with
// per-round engagement and tension telemetry instead of only win rates.
//
// Comparing a rule change: on the baseline engine, save the --json output to a file; on the
// changed engine, run with --baseline=<file> on the same seeds to print a comparison. Keep the
// bot population fixed across compared runs, and regenerate the baseline after every merged
// rule change so every comparison is against the current game.
//
// Usage:
//   node scripts/bench-gameplay.ts [--json] [seed ...]
//   node scripts/bench-gameplay.ts --baseline=<report.json> [seed ...]

const args = process.argv.slice(2)
const seeds = args.filter((arg) => !arg.startsWith('--'))
const json = args.includes('--json')
const baselinePath = args
  .find((arg) => arg.startsWith('--baseline='))
  ?.slice('--baseline='.length)
const MAX_TURNS = 240

const POPULATION: { name: string; make: () => Bot }[] = [
  { name: 'depthsearch-normal', make: () => new DepthsearchBot(BOT_LEVELS.normal) },
  { name: 'depthsearch-hard', make: () => new DepthsearchBot(BOT_LEVELS.hard) },
  { name: 'napoleon', make: () => new NapoleonBot(NAPOLEON_LEVELS.hard) },
  { name: 'hannibal', make: () => new HannibalBot() },
  { name: 'random', make: () => new RandomBot() },
  { name: 'turtle', make: () => new TurtleBot() },
]

const SETUP = {
  biome: 'desert',
  player: ['king', 'swordsman', 'archer', 'ninja', 'lancer'],
  enemy: ['king', 'swordsman', 'archer', 'ninja', 'lancer'],
} as const satisfies BattleSetup

async function playMatch(
  seed: string,
  playerEntry: { name: string; make: () => Bot },
  enemyEntry: { name: string; make: () => Bot },
): Promise<MatchMetrics> {
  let state: GameState = initialState(symmetricSeed(seed), SETUP, 'player')
  const playerBot = playerEntry.make()
  const enemyBot = enemyEntry.make()
  const telemetry = []
  let snapshotRound = state.round
  let blowsFrom = 0
  let moves = 0
  let retreats = 0
  for (let turn = 0; turn < MAX_TURNS && !state.winner; turn++) {
    const acting: Side = activePawn(state)!.side
    const actions = await (acting === 'player' ? playerBot : enemyBot).chooseActions(state)
    for (const action of actions) {
      const actor = activePawn(state)
      const before = actor ? nearestEnemyDistance(state, actor) : 0
      const next = reducer(state, action)
      if (next === state)
        throw new Error(
          `Illegal ${JSON.stringify(action)} in ${playerEntry.name} vs ${enemyEntry.name}`,
        )
      if (action.type === 'move' && actor) {
        moves++
        const moved = next.pawns.find((pawn) => pawn.id === actor.id)
        if (moved && nearestEnemyDistance(next, moved) > before) retreats++
      }
      state = next
    }
    if (state.round !== snapshotRound || state.winner) {
      telemetry.push(
        roundTelemetry(
          state,
          state.round !== snapshotRound ? snapshotRound : state.round,
          blowsFrom,
          moves,
          retreats,
        ),
      )
      blowsFrom = state.blows.length
      snapshotRound = state.round
      moves = 0
      retreats = 0
    }
  }
  return matchMetrics(seed, playerEntry.name, enemyEntry.name, telemetry, state)
}

const matches: MatchMetrics[] = []
for (const seed of seeds.length ? seeds : ['alpha', 'bravo']) {
  for (let a = 0; a < POPULATION.length; a++)
    for (let b = a + 1; b < POPULATION.length; b++)
      for (const [player, enemy] of [
        [POPULATION[a], POPULATION[b]],
        [POPULATION[b], POPULATION[a]],
      ]) {
        const match = await playMatch(seed, player, enemy)
        matches.push(match)
        if (!json)
          console.log(
            `${match.seed} ${match.playerBot} vs ${match.enemyBot}: ` +
              `${match.winner ?? 'unfinished'} in ${match.rounds} rounds, ` +
              `contact ${match.firstContactRound ?? '-'}, stall ${match.maxStallStreak}, ` +
              `turtle ${match.lateTurtleIndex.player.toFixed(2)}/${match.lateTurtleIndex.enemy.toFixed(2)}, ` +
              `retreat ${Math.round(match.retreatRatio * 100)}%, ` +
              `leads ${match.leadChanges}, decision ${match.decisionShare !== null ? Math.round(match.decisionShare * 100) + '%' : '-'}, ` +
              `killer kinds ${match.killerKinds}`,
          )
      }
}

const report = summarize(matches)
if (json) {
  console.log(JSON.stringify({ report, matches }, null, 2))
} else {
  const percent = (value: number | null) =>
    value === null ? '-' : `${Math.round(value * 100)}%`
  console.log('')
  console.log(
    `Population: ${report.matches} matches, ${report.decisive} decisive, ` +
      `${percent(report.drawRate)} draws/unfinished`,
  )
  console.log(
    `Engagement: median first contact round ${report.medianFirstContact ?? '-'}, ` +
      `worst stall ${report.worstStall}, median late turtle index ${percent(report.medianLateTurtle)}, ` +
      `median retreat ratio ${percent(report.medianRetreatRatio)}`,
  )
  console.log(
    `Tension: median length ${report.medianRounds} rounds, median lead changes ${report.medianLeadChanges}, ` +
      `median decision at ${percent(report.medianDecisionShare)} of battle, median swing ${report.medianSwing?.toFixed(3)}`,
  )
  console.log(`Wins: ${JSON.stringify(report.botWins)}`)
  console.log(
    `Turtle probe: ${report.turtleRecord.wins} wins in ${report.turtleRecord.matches} matches`,
  )
  const failures = gateFailures(report)
  console.log(
    failures.length ? `Gates FAILED:\n  - ${failures.join('\n  - ')}` : 'Gates: all pass',
  )
  if (baselinePath) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as {
      report: PopulationReport
      matches: MatchMetrics[]
    }
    const key = (match: MatchMetrics) => `${match.seed}:${match.playerBot}vs${match.enemyBot}`
    const baselineKeys = new Set(baseline.matches.map(key))
    if (
      baselineKeys.size !== matches.length ||
      matches.some((match) => !baselineKeys.has(key(match)))
    )
      throw new Error(
        'Baseline covers different matches: regenerate it with the same seeds and population',
      )
    const count = (value: number | null) => (value === null ? '-' : `${value}`)
    const swingText = (value: number | null) => (value === null ? '-' : value.toFixed(3))
    const percentOf = (value: number | null) =>
      value === null ? '-' : `${Math.round(value * 100)}%`
    const rows: [string, string, string][] = [
      ['draw / unfinished', percentOf(baseline.report.drawRate), percentOf(report.drawRate)],
      ['median rounds', count(baseline.report.medianRounds), count(report.medianRounds)],
      [
        'median first contact',
        count(baseline.report.medianFirstContact),
        count(report.medianFirstContact),
      ],
      ['worst stall', count(baseline.report.worstStall), count(report.worstStall)],
      [
        'median late turtle index',
        percentOf(baseline.report.medianLateTurtle),
        percentOf(report.medianLateTurtle),
      ],
      [
        'median retreat ratio',
        percentOf(baseline.report.medianRetreatRatio),
        percentOf(report.medianRetreatRatio),
      ],
      [
        'median lead changes',
        count(baseline.report.medianLeadChanges),
        count(report.medianLeadChanges),
      ],
      [
        'median decision share',
        percentOf(baseline.report.medianDecisionShare),
        percentOf(report.medianDecisionShare),
      ],
      ['median swing', swingText(baseline.report.medianSwing), swingText(report.medianSwing)],
      [
        'turtle probe wins',
        `${baseline.report.turtleRecord.wins}/${baseline.report.turtleRecord.matches}`,
        `${report.turtleRecord.wins}/${report.turtleRecord.matches}`,
      ],
    ]
    console.log('')
    console.log(`Against ${baselinePath} (baseline -> current):`)
    for (const [label, was, now] of rows) console.log(`  ${label}: ${was} -> ${now}`)
  }
}
