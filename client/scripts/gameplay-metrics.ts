import { hexDist } from '../src/lib/engine/hex.ts'
import type { GameState, Side } from '../src/lib/engine/index.ts'
import { valueFeatures } from '../src/bots/valueFeatures.ts'
import { predictValue, VALUE_MODELS } from '../src/bots/valueModel.ts'

// Gameplay-quality telemetry: pure functions over GameState snapshots, so a rule change can be
// A/B tested by running the same seeded matches before and after and diffing the reports.
//
// Engine semantics this builds on: blows record kills (a blow is only pushed when a pawn falls),
// lastClashRound tracks the last round any damage was dealt, and valueFeatures returns zeros
// once the battle is decided, so the winner snapshot carries no value signal.

// A pawn counts as hiding behind its lines once it stands this far from every enemy.
const TURTLE_DISTANCE = 4
// Rounds after which camping counts; early positioning is legitimate deployment.
const LATE_ROUND = 6

export type RoundTelemetry = {
  round: number
  clash: boolean
  kills: number
  minDistance: number
  meanDistance: number
  value: number
  turtleIndex: Record<Side, number>
  moves: number
  retreats: number
}

export type MatchMetrics = {
  seed: string
  playerBot: string
  enemyBot: string
  winner: Side | 'draw' | null
  rounds: number
  firstContactRound: number | null
  maxStallStreak: number
  lateTurtleIndex: Record<Side, number>
  retreatRatio: number
  leadChanges: number
  decisionRound: number | null
  decisionShare: number | null
  swing: number
  killerKinds: number
}

export type PopulationReport = {
  matches: number
  decisive: number
  drawRate: number
  medianRounds: number
  medianFirstContact: number | null
  worstStall: number
  medianLateTurtle: number | null
  medianRetreatRatio: number | null
  medianLeadChanges: number | null
  medianDecisionShare: number | null
  medianSwing: number | null
  botWins: Record<string, number>
  turtleRecord: { wins: number; matches: number }
}

export function nearestEnemyDistance(
  state: GameState,
  pawn: { q: number; r: number; side: Side },
): number {
  let distance = Infinity
  for (const foe of state.pawns)
    if (foe.side !== pawn.side && foe.hp > 0) distance = Math.min(distance, hexDist(pawn, foe))
  return distance
}

// One snapshot per round boundary: the state as the round that just ended, with that round's
// action counters. blowsFrom indexes the first blow not yet attributed to a round.
export function roundTelemetry(
  state: GameState,
  round: number,
  blowsFrom: number,
  moves: number,
  retreats: number,
): RoundTelemetry {
  const player = state.pawns.filter((p) => p.side === 'player' && p.hp > 0)
  const enemy = state.pawns.filter((p) => p.side === 'enemy' && p.hp > 0)
  const distances = player.flatMap((a) => enemy.map((b) => hexDist(a, b)))
  const hiding = (side: Side) => {
    const army = side === 'player' ? player : enemy
    if (!army.length) return 0
    return (
      army.filter((pawn) => nearestEnemyDistance(state, pawn) > TURTLE_DISTANCE).length /
      army.length
    )
  }
  return {
    round,
    clash: state.lastClashRound === round,
    kills: state.blows.slice(blowsFrom).reduce((sum, blow) => sum + blow.fallen.length, 0),
    minDistance: distances.length ? Math.min(...distances) : Infinity,
    meanDistance: distances.length
      ? distances.reduce((sum, distance) => sum + distance, 0) / distances.length
      : Infinity,
    value: predictValue(
      valueFeatures(state, 'player', { reach: new Map() }, true),
      VALUE_MODELS.baseline,
    ),
    turtleIndex: { player: hiding('player'), enemy: hiding('enemy') },
    moves,
    retreats,
  }
}

const leadOf = (value: number): Side | null =>
  value > 0.5 ? 'player' : value < 0.5 ? 'enemy' : null

export function matchMetrics(
  seed: string,
  playerBot: string,
  enemyBot: string,
  telemetry: RoundTelemetry[],
  finalState: GameState,
): MatchMetrics {
  const winner = finalState.winner
  const rounds = telemetry.at(-1)?.round ?? finalState.round
  let firstContactRound: number | null = null
  let maxStallStreak = 0
  let stallRun = 0
  for (let i = 0; i < telemetry.length; i++) {
    const round = telemetry[i]
    if (firstContactRound === null && round.clash) firstContactRound = round.round
    if (i > 0) {
      const previous = telemetry[i - 1]
      if (!round.clash && round.minDistance >= previous.minDistance) {
        stallRun++
        maxStallStreak = Math.max(maxStallStreak, stallRun)
      } else stallRun = 0
    }
  }
  const late = telemetry.filter((round) => round.round >= LATE_ROUND)
  const lateTurtle = (side: Side) =>
    late.length ? Math.max(...late.map((round) => round.turtleIndex[side])) : 0
  const moves = telemetry.reduce((sum, round) => sum + round.moves, 0)
  const retreats = telemetry.reduce((sum, round) => sum + round.retreats, 0)
  // The winner snapshot carries no value signal (features are zeroed once decided).
  const curve = finalState.winner ? telemetry.slice(0, -1) : telemetry
  let leadChanges = 0
  let previousLead: Side | null = null
  let swingSum = 0
  for (let i = 0; i < curve.length; i++) {
    const lead = leadOf(curve[i].value)
    if (lead && previousLead && lead !== previousLead) leadChanges++
    if (lead) previousLead = lead
    if (i > 0) swingSum += Math.abs(curve[i].value - curve[i - 1].value)
  }
  let decisionRound: number | null = null
  if (winner === 'player' || winner === 'enemy') {
    let settled = 0
    for (let i = 0; i < curve.length; i++)
      if (leadOf(curve[i].value) !== winner) settled = i + 1
    decisionRound = curve[settled]?.round ?? null
  }
  return {
    seed,
    playerBot,
    enemyBot,
    winner,
    rounds,
    firstContactRound,
    maxStallStreak,
    lateTurtleIndex: { player: lateTurtle('player'), enemy: lateTurtle('enemy') },
    retreatRatio: moves ? retreats / moves : 0,
    leadChanges,
    decisionRound,
    decisionShare: decisionRound !== null ? decisionRound / rounds : null,
    swing: curve.length > 1 ? swingSum / (curve.length - 1) : 0,
    killerKinds: new Set(
      finalState.blows.filter((blow) => blow.by).map((blow) => blow.by!.kind),
    ).size,
  }
}

const median = (values: number[]): number | null => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function summarize(matches: MatchMetrics[]): PopulationReport {
  const decisive = matches.filter(
    (match) => match.winner === 'player' || match.winner === 'enemy',
  )
  const botWins: Record<string, number> = {}
  for (const match of decisive) {
    const name = match.winner === 'player' ? match.playerBot : match.enemyBot
    botWins[name] = (botWins[name] ?? 0) + 1
  }
  const turtleMatches = matches.filter(
    (match) => match.playerBot === 'turtle' || match.enemyBot === 'turtle',
  )
  const turtleWins = turtleMatches.filter(
    (match) =>
      (match.winner === 'player' && match.playerBot === 'turtle') ||
      (match.winner === 'enemy' && match.enemyBot === 'turtle'),
  ).length
  return {
    matches: matches.length,
    decisive: decisive.length,
    drawRate: matches.length ? 1 - decisive.length / matches.length : 0,
    medianRounds: median(matches.map((match) => match.rounds)) ?? 0,
    medianFirstContact: median(
      matches
        .map((match) => match.firstContactRound)
        .filter((round): round is number => round !== null),
    ),
    worstStall: Math.max(0, ...matches.map((match) => match.maxStallStreak)),
    medianLateTurtle: median(
      matches.flatMap((match) => [match.lateTurtleIndex.player, match.lateTurtleIndex.enemy]),
    ),
    medianRetreatRatio: median(matches.map((match) => match.retreatRatio)),
    medianLeadChanges: median(matches.map((match) => match.leadChanges)),
    medianDecisionShare: median(
      matches
        .map((match) => match.decisionShare)
        .filter((share): share is number => share !== null),
    ),
    medianSwing: median(matches.map((match) => match.swing)),
    botWins,
    turtleRecord: { wins: turtleWins, matches: turtleMatches.length },
  }
}

// Gameplay gates in the spirit of scripts/value-pipeline.ts acceptanceFailures: a rule change
// must keep every battle tense, mobile and decisive, not only win-rated.
export function gateFailures(report: PopulationReport): string[] {
  const failures: string[] = []
  if (report.medianFirstContact === null || report.medianFirstContact > 4)
    failures.push(
      `armies meet too late (median first contact round ${report.medianFirstContact})`,
    )
  if (report.worstStall > 3)
    failures.push(`a match stalled ${report.worstStall} rounds without progress`)
  if (report.drawRate > 0.2)
    failures.push(`${Math.round(report.drawRate * 100)}% of matches end without a winner`)
  if (report.turtleRecord.wins > 0)
    failures.push(
      `the turtle stall probe won ${report.turtleRecord.wins}/${report.turtleRecord.matches} matches`,
    )
  if (report.medianDecisionShare !== null && report.medianDecisionShare < 0.4)
    failures.push(
      `games are decided early (median decision at ${Math.round(report.medianDecisionShare * 100)}% of battle length)`,
    )
  return failures
}
