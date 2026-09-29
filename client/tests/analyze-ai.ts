import { CAMPAIGNS } from '../src/lib/campaign.ts'
import { activePawn, initialState, reducer } from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/engine/bot.ts'
import { searchStats } from '../src/lib/engine/ai/strategies/depthsearch.ts'
import type { BotDifficulty } from '../src/lib/engine/ai.ts'
import { campaignActions, winnableAgainst } from './campaign-actions.ts'

// Replays a campaign level with the real bots and reports where the search spends its budget.
//   node tests/analyze-ai.ts <slug>            scan: one line per level, test path with retries
//   node tests/analyze-ai.ts <slug> <id>       deep: one line per AI decision
//   options: --difficulty=<easy|normal|hard> --caution=<0.25>

type Row = {
  side: string
  round: number
  unit: string
  ms: number
  stats: Record<string, number>
}

const args = process.argv.slice(2)
const option = (name: string, fallback: string) =>
  args.find((arg) => arg.startsWith('--' + name + '='))?.split('=')[1] ?? fallback

function replay(
  level: (typeof CAMPAIGNS)[number]['levels'][number],
  caution: number,
  log: Row[],
) {
  const difficulty = (level.difficulty ?? 'normal') as BotDifficulty
  let state = initialState(level.seed, level.setup, 'player')
  for (let step = 0; step < 300 && !state.winner; step++) {
    const pawn = activePawn(state)!
    const enemy = pawn.side === 'enemy'
    const started = performance.now()
    const actions = enemy
      ? chooseBotActions(state, difficulty)
      : campaignActions(state, caution)
    const ms = performance.now() - started
    if (searchStats.decisions > 0)
      log.push({
        side: pawn.side,
        round: state.round,
        unit: pawn.kind,
        ms,
        stats: { ...searchStats },
      })
    for (const action of actions) state = reducer(state, action)
  }
  return state
}

function scan(slug: string) {
  const pack = CAMPAIGNS.find((pack) => pack.slug === slug)!
  console.log(`Scanning ${pack.name} with the test's retry ladder`)
  const rows: [string, number, boolean, number][] = []
  for (const level of pack.levels) {
    const started = performance.now()
    const winnable = winnableAgainst(level, (level.difficulty ?? 'normal') as BotDifficulty)
    rows.push([level.name, performance.now() - started, winnable, level.id])
  }
  for (const [name, ms, winnable, id] of rows.sort((a, b) => b[1] - a[1]))
    console.log(
      `level ${String(id).padStart(2)}  ${winnable ? 'winnable' : 'LOST   '}  ${(ms / 1000).toFixed(1).padStart(6)} s  ${name}`,
    )
}

const quantile = (values: number[], q: number) =>
  values[Math.min(values.length - 1, Math.floor(values.length * q))]

function deep(slug: string, id: number) {
  const pack = CAMPAIGNS.find((pack) => pack.slug === slug)!
  const level = pack.levels.find((level) => level.id === id)!
  const caution = Number(option('caution', '0.25'))
  const rows: Row[] = []
  const state = replay(level, caution, rows)
  console.log(
    `${level.name} at caution ${caution}: ${state.winner ?? 'no winner'} after ${rows.length} decisions`,
  )
  console.log(
    ' round side    unit       ms  plans  short  beams  leafs  root%  cutoffs  breaks  depth',
  )
  for (const row of rows) {
    const s = row.stats
    console.log(
      ` ${String(row.round).padStart(5)} ${row.side.slice(0, 5).padEnd(6)} ${row.unit.padEnd(10)}` +
        ` ${row.ms.toFixed(0).padStart(4)} ${String(s.plansEnumerated).padStart(6)}` +
        ` ${String(s.shortlisted).padStart(6)} ${String(s.beamExpansions).padStart(6)}` +
        ` ${String(s.leafEvals).padStart(6)}` +
        ` ${((100 * s.rootLeafEvals) / Math.max(1, s.leafEvals)).toFixed(0).padStart(5)}%` +
        ` ${String(s.cutoffs).padStart(7)} ${String(s.budgetBreaks).padStart(7)}` +
        ` ${String(s.maxDepth).padStart(6)}`,
    )
  }
  const totals = rows.reduce(
    (acc, row) => {
      acc.ms += row.ms
      acc.leafs += row.stats.leafEvals
      acc.plans += row.stats.plansEnumerated
      acc.cutoffs += row.stats.cutoffs
      acc.breaks += row.stats.budgetBreaks
      acc.beams += row.stats.beamExpansions
      acc.root += row.stats.rootLeafEvals
      acc.deep += row.stats.deepLeafEvals
      acc.reply += row.stats.replyLeafEvals
      return acc
    },
    { ms: 0, leafs: 0, plans: 0, cutoffs: 0, breaks: 0, beams: 0, root: 0, deep: 0, reply: 0 },
  )
  const times = rows.map((row) => row.ms).sort((a, b) => a - b)
  const leafs = rows.map((row) => row.stats.leafEvals).sort((a, b) => a - b)
  const spent = rows.filter((row) => row.stats.leafEvals >= 1500).length
  const pruned = rows.filter((row) => row.stats.leafEvals < 1500).length
  console.log('\nTotals over', rows.length, 'decisions')
  console.log(
    `  time ${totals.ms.toFixed(0)} ms total, median ${quantile(times, 0.5).toFixed(0)} ms, p90 ${quantile(times, 0.9).toFixed(0)} ms, worst ${times.at(-1)!.toFixed(0)} ms`,
  )
  console.log(
    `  budget exhausted on ${spent} decisions, spare budget on ${pruned} (median ${quantile(leafs, 0.5)}, p90 ${quantile(leafs, 0.9)}, worst ${leafs.at(-1)})`,
  )
  console.log(
    `  leaf evaluation split: root ${((100 * totals.root) / Math.max(1, totals.leafs)).toFixed(0)}%, deeper ranked turns ${((100 * totals.deep) / Math.max(1, totals.leafs)).toFixed(0)}%, last-reply scans ${((100 * totals.reply) / Math.max(1, totals.leafs)).toFixed(0)}%`,
  )
  console.log(
    `  alpha-beta cutoffs ${totals.cutoffs} on ${totals.beams} beam expansions (${((100 * totals.cutoffs) / Math.max(1, totals.beams)).toFixed(0)}%)`,
  )
  console.log(`  budget-starved nodes ${totals.breaks}, plans enumerated ${totals.plans}`)
}

const [slug, id] = args.filter((arg) => !arg.startsWith('--'))
if (id) deep(slug, Number(id))
else scan(slug)
