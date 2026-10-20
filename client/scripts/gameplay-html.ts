import type { experimentReport, pairedComparison } from './gameplay-report.ts'

type Report = ReturnType<typeof experimentReport>
type Comparison = ReturnType<typeof pairedComparison>
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )

function bars(title: string, entries: [string, number | null][], percent = false) {
  const max = Math.max(1, ...entries.map(([, value]) => value ?? 0))
  return `<section><h2>${escape(title)}</h2>${entries.map(([label, value]) => `<div class="row"><span>${escape(label)}</span><div class="track"><div class="bar" style="width:${((value ?? 0) / max) * 100}%"></div></div><b>${value === null ? 'n/a' : percent ? (value * 100).toFixed(1) + '%' : value.toFixed(2)}</b></div>`).join('')}</section>`
}

function changes(comparison: Comparison) {
  const labels: Record<string, string> = {
    rounds: 'Battle length',
    unfinished: 'Unfinished rate',
    noContact: 'No-contact rate',
    stalledRounds: 'Stall rounds',
    combatRounds: 'Combat rounds',
    hostileDamage: 'Enemy damage',
    focusFireDamage: 'Coordinated damage',
    healing: 'Healing',
    energyGranted: 'Energy support',
  }
  return `<section class="wide"><h2>Paired impact</h2><p>Dot: mean change. Line: approximate 95% interval, clustered by seed. Zero means no change. Each row has its own scale; units are not interchangeable.</p>${Object.entries(
    labels,
  )
    .map(([key, label]) => {
      const metric = comparison.population[key]!
      const delta = metric.delta
      const interval = metric.approximate95
      if (delta === null) return ''
      const scale = Math.max(Math.abs(delta), ...(interval?.map(Math.abs) ?? []), 0.001) * 1.15
      const x = (v: number) => 150 + (v / scale) * 140
      return `<div class="row"><span>${label}</span><svg viewBox="0 0 300 30" role="img" aria-label="${label}: change ${delta.toFixed(3)}"><line x1="150" x2="150" y1="0" y2="30" stroke="#8c929f"/>${interval ? `<line x1="${x(interval[0]!)}" x2="${x(interval[1]!)}" y1="15" y2="15" stroke="#f5be62" stroke-width="3"/>` : ''}<circle cx="${x(delta)}" cy="15" r="5" fill="#6ed4bd"/></svg><b>${delta > 0 ? '+' : ''}${delta.toFixed(3)}</b></div>`
    })
    .join('')}</section>`
}

export function gameplayHtml(run: {
  phase: string
  config: unknown
  provenance: unknown
  report: Report
  comparison?: Comparison
}) {
  const report = run.report
  const population = report.population
  const unitEntries = Object.entries(population.units)
  const chart = (
    title: string,
    values: Record<string, typeof population>,
    metric: keyof typeof population,
    percent = false,
  ) =>
    bars(
      title,
      Object.entries(values).map(([label, data]) => [
        label,
        typeof data[metric] === 'number' ? (data[metric] as number) : null,
      ]),
      percent,
    )
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gameplay evaluation · ${escape(run.phase)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#10151d;color:#e8edf4;font:15px system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:28px}h1{font-size:clamp(26px,5vw,42px);margin:12px 0}h2{font-size:18px}p{color:#abb7c6;line-height:1.6}.badge{color:#6ed4bd;text-transform:uppercase;letter-spacing:2px}.cards,.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:18px}.card,section{background:#19212d;border:1px solid #2e3949;border-radius:14px;padding:20px;margin:12px 0}.card strong{display:block;font-size:32px}.card span{color:#abb7c6}.wide{grid-column:1/-1}.row{display:grid;grid-template-columns:minmax(100px,1fr) minmax(80px,2fr) 65px;gap:10px;align-items:center;margin:14px 0;font-size:13px}.row span{overflow-wrap:anywhere}.row b{text-align:right}.track{height:12px;background:#293547;border-radius:6px;overflow:hidden}.bar{height:100%;background:#6ed4bd;border-radius:6px}svg{width:100%;height:30px}pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#abb7c6}summary{cursor:pointer}footer{padding:24px 0;color:#abb7c6}
  </style><main><div class="badge">${escape(run.phase)} · gameplay evaluation</div><h1>What changes the way battles play?</h1><p>Measured gameplay under the declared bots and scenarios. Not a universal fun score. Hannibal's cautious play is evaluated in normal matches alongside the other strategies.</p><div class="cards">${[
    ['Matches', population.matches.toString()],
    ['Unfinished', ((population.unfinishedRate ?? 0) * 100).toFixed(1) + '%'],
    ['No contact', ((population.noContactRate ?? 0) * 100).toFixed(1) + '%'],
    ['Median rounds', population.medianRounds.toString()],
  ]
    .map(
      ([label, value]) =>
        `<div class="card"><span>${label}</span><strong>${value}</strong></div>`,
    )
    .join('')}</div><div class="charts">
  ${run.comparison ? changes(run.comparison) : ''}
  ${chart('Stall rounds by biome', report.byBiome, 'meanStalledRounds')}
  ${chart('Unfinished games by biome', report.byBiome, 'unfinishedRate', true)}
  ${chart('Stall rounds by army matchup', report.byRoster, 'meanStalledRounds')}
  ${chart('Stall rounds by bot matchup', report.byMatchup, 'meanStalledRounds')}
  ${bars(
    'Enemy damage per unit appearance',
    unitEntries.map(([kind, stats]) => [kind, stats.damage]),
  )}
  ${bars(
    'Survival by unit',
    unitEntries.map(([kind, stats]) => [kind, stats.survivalRate]),
    true,
  )}
  ${bars(
    'Healing per appearance',
    unitEntries.map(([kind, stats]) => [kind, stats.healing]),
  )}
  ${bars(
    'Energy granted per appearance',
    unitEntries.map(([kind, stats]) => [kind, stats.energyGranted]),
  )}
  ${bars(
    'Intercepted damage per appearance',
    unitEntries.map(([kind, stats]) => [kind, stats.interceptedDamage]),
  )}
  ${bars(
    'Coordinated damage per appearance',
    unitEntries.map(([kind, stats]) => [kind, stats.focusFireDamage]),
  )}
  <section class="wide"><h2>Interpretation</h2><p>Lower stalling is desirable, but shorter battles alone can mean a weaker army or a runaway advantage. Compare outcomes and unit contributions together. Support and coordinated attacks are observed sequences, not causal synergy. Confirmation must use fresh seeds after rules and stats are frozen. Approximate intervals do not correct for screening many ideas.</p><details><summary>Run configuration and provenance</summary><pre>${escape(JSON.stringify({ config: run.config, provenance: run.provenance }, null, 2))}</pre></details>${run.comparison ? `<details><summary>Full paired context comparisons</summary><pre>${escape(JSON.stringify(run.comparison, null, 2))}</pre></details>` : ''}</section></div><footer>Self-contained report. No network requests or external chart dependencies.</footer></main></html>`
}
