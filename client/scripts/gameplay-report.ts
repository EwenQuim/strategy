import { summarize } from './gameplay-metrics.ts'
import type { ExperimentMatch, Substitution } from './gameplay-experiment.ts'

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

function describe(matches: ExperimentMatch[]) {
  const units = new Map<string, ExperimentMatch['units']>()
  for (const match of matches)
    for (const unit of match.units) {
      const entries = units.get(unit.kind) ?? []
      entries.push(unit)
      units.set(unit.kind, entries)
    }
  return {
    ...summarize(matches.map((m) => m.metrics)),
    noContactRate: mean(matches.map((m) => Number(m.metrics.firstContactRound === null))),
    unfinishedRate: mean(matches.map((m) => Number(m.metrics.winner === null))),
    meanStalledRounds: mean(matches.map((m) => m.stalledRounds)),
    meanCombatRounds: mean(matches.map((m) => m.combatRounds)),
    meanHostileDamage: mean(matches.map((m) => m.hostileDamage)),
    idleActivationRate: mean(
      matches.map((m) => m.idleActivations / Math.max(1, m.activations)),
    ),
    units: Object.fromEntries(
      [...units].map(([kind, entries]) => [
        kind,
        {
          appearances: entries.length,
          survivalRate: mean(entries.map((u) => Number(u.survived))),
          damage: mean(entries.map((u) => u.damage)),
          kills: mean(entries.map((u) => u.kills)),
          attacks: mean(entries.map((u) => u.attacks)),
          healing: mean(entries.map((u) => u.healing)),
          energyGranted: mean(entries.map((u) => u.energyGranted)),
          protections: mean(entries.map((u) => u.protections)),
          interceptedDamage: mean(entries.map((u) => u.interceptedDamage)),
          displacements: mean(entries.map((u) => u.displacements)),
          followUpDamage: mean(entries.map((u) => u.followUpDamage)),
          focusFireDamage: mean(entries.map((u) => u.focusFireDamage)),
          attackOpportunities: mean(entries.map((u) => u.attackOpportunities)),
          declinedAttacks: mean(entries.map((u) => u.declinedAttacks)),
          nearbyEnemyRetreats: mean(entries.map((u) => u.nearbyEnemyRetreats)),
          nonParticipantRate: mean(
            entries.map((u) =>
              Number(!u.attacks && !u.healing && !u.energyGranted && !u.protections),
            ),
          ),
        },
      ]),
    ),
  }
}

function group(matches: ExperimentMatch[], key: (match: ExperimentMatch) => string) {
  return Object.fromEntries(
    [...new Set(matches.map(key))].map((label) => [
      label,
      describe(matches.filter((m) => key(m) === label)),
    ]),
  )
}

export function experimentReport(matches: ExperimentMatch[]) {
  return {
    ordinary: describe(matches.filter((m) => !m.probe)),
    probes: describe(matches.filter((m) => m.probe)),
    byBiome: group(matches, (m) => m.biome),
    byRoster: group(matches, (m) => m.roster),
    byMatchup: group(matches, (m) => `${m.playerBot}/${m.enemyBot}`),
    byContext: group(
      matches,
      (m) => `${m.biome}/${m.roster}/${m.probe ? 'probe' : 'ordinary'}`,
    ),
  }
}

export function pairedComparison(
  baseline: ExperimentMatch[],
  current: ExperimentMatch[],
  substitution?: Substitution,
) {
  const previous = new Map(baseline.map((m) => [m.id, m]))
  if (
    previous.size !== baseline.length ||
    previous.size !== current.length ||
    new Set(current.map((m) => m.id)).size !== current.length
  )
    throw new Error('Comparison requires identical unique match IDs')
  const pairs = current.map((now) => {
    const was = previous.get(now.id)
    if (!was || JSON.stringify(was.start) !== JSON.stringify(now.start))
      throw new Error(`Unmatched starting position: ${now.id}`)
    return { was, now }
  })
  const metrics: Record<string, (m: ExperimentMatch) => number> = {
    rounds: (m) => m.metrics.rounds,
    unfinished: (m) => Number(m.metrics.winner === null),
    noContact: (m) => Number(m.metrics.firstContactRound === null),
    contactRoundCapped: (m) => m.metrics.firstContactRound ?? m.metrics.rounds,
    stalledRounds: (m) => m.stalledRounds,
    maxStall: (m) => m.metrics.maxStallStreak,
    combatRounds: (m) => m.combatRounds,
    hostileDamage: (m) => m.hostileDamage,
    retreatRatio: (m) => m.metrics.retreatRatio,
    idleActivations: (m) => m.idleActivations / Math.max(1, m.activations),
    focusFireDamage: (m) => m.units.reduce((sum, u) => sum + u.focusFireDamage, 0),
    healing: (m) => m.units.reduce((sum, u) => sum + u.healing, 0),
    energyGranted: (m) => m.units.reduce((sum, u) => sum + u.energyGranted, 0),
    substitutedSideWin: (m) => Number(m.metrics.winner === (substitution?.side ?? 'player')),
    substitutedSideLoss: (m) =>
      Number(
        m.metrics.winner ===
          ((substitution?.side ?? 'player') === 'player' ? 'enemy' : 'player'),
      ),
  }
  const summarizePairs = (entries: typeof pairs) =>
    Object.fromEntries(
      Object.entries(metrics).map(([name, metric]) => {
        const deltas = entries.map((p) => ({
          seed: p.now.seed,
          delta: metric(p.now) - metric(p.was),
        }))
        const estimate = mean(deltas.map((d) => d.delta))
        const clusters = [...new Set(deltas.map((d) => d.seed))].map((seed) =>
          mean(deltas.filter((d) => d.seed === seed).map((d) => d.delta))!,
        )
        const center = mean(clusters)
        const se =
          clusters.length > 1
            ? Math.sqrt(
                clusters.reduce((sum, v) => sum + (v - center!) ** 2, 0) /
                  (clusters.length * (clusters.length - 1)),
              )
            : null
        return [
          name,
          {
            baseline: mean(entries.map((p) => metric(p.was))),
            current: mean(entries.map((p) => metric(p.now))),
            delta: estimate,
            seedClusters: clusters.length,
            approximate95:
              se === null || center === null ? null : [center - 1.96 * se, center + 1.96 * se],
          },
        ]
      }),
    )
  return {
    method:
      'Paired mean deltas; approximate normal 95% intervals clustered by seed. Few seeds are exploratory, not a significance claim. No multiplicity correction.',
    ordinary: summarizePairs(pairs.filter((p) => !p.now.probe)),
    probes: summarizePairs(pairs.filter((p) => p.now.probe)),
    byContext: Object.fromEntries(
      [
        ...new Set(
          current.map((m) => `${m.biome}/${m.roster}/${m.probe ? 'probe' : 'ordinary'}`),
        ),
      ].map((label) => [
        label,
        summarizePairs(
          pairs.filter(
            (p) =>
              `${p.now.biome}/${p.now.roster}/${p.now.probe ? 'probe' : 'ordinary'}` === label,
          ),
        ),
      ]),
    ),
    byMatchup: Object.fromEntries(
      [...new Set(current.map((m) => `${m.playerBot}/${m.enemyBot}`))].map((label) => [
        label,
        summarizePairs(pairs.filter((p) => `${p.now.playerBot}/${p.now.enemyBot}` === label)),
      ]),
    ),
  }
}
