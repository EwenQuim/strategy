import { activePawn, type Action, type GameState } from '../../lib/engine/engine.ts'
import type { Side } from '../../lib/engine/pawns/index.ts'
import { BOT_LEVELS, type BotOptions } from '../../lib/engine/ai.ts'
import {
  distancesToAttack,
  evaluatePosition,
  type ReachCache,
} from '../../lib/engine/ai/evaluate.ts'
import { sidePlan } from '../../lib/engine/ai/plan.ts'
import { chooseOption, hpOf } from '../../lib/engine/ai/choice.ts'
import { introductionTurns } from '../introductions.ts'
import { inHellfire } from '../../lib/engine/hellfire.ts'
import {
  generateTurnPlans,
  positionKey,
  turnPlans,
  type TurnPlan,
} from '../../lib/engine/ai/turns.ts'
import type { Bot } from '../bot.ts'
import { readOptions, validOptions } from '../options.ts'

type ScoredTurn = TurnPlan & { value: number }
type Search = {
  side: Side
  beamWidth: number
  budget: number
  leaf: (state: GameState) => number
  scores: Map<string, number>
}

export const searchStats = {
  decisions: 0,
  plansEnumerated: 0,
  shortlisted: 0,
  beamExpansions: 0,
  leafEvals: 0,
  rootLeafEvals: 0,
  deepLeafEvals: 0,
  replyLeafEvals: 0,
  cutoffs: 0,
  budgetBreaks: 0,
  maxDepth: 0,
}

// A deterministic work budget bounds response time even when another ply is requested.
const POSITION_BUDGET = 1500
const SHORTLIST = 200
// Keep root turns well below a lethal-King penalty out of the deeper search.
const VIABLE_SCORE_MARGIN = 50_000
const usesAbility = (plan: TurnPlan) => plan.actions.some((action) => action.type === 'special')

export class DepthsearchBot implements Bot<BotOptions> {
  readonly name = 'depthsearch'
  readonly options: Readonly<BotOptions>

  constructor(options: Partial<BotOptions> = {}) {
    this.options = readOptions<BotOptions>(BOT_LEVELS.normal, options)
    if (!validOptions(this.options)) throw new RangeError('Invalid bot options')
  }

  async chooseActions(state: GameState): Promise<Action[]> {
    const options = this.options
    for (const key of Object.keys(searchStats) as (keyof typeof searchStats)[])
      searchStats[key] = 0
    searchStats.decisions = 1
    const pawn = activePawn(state)
    if (!pawn || state.winner) return []
    if (pawn.energy <= 0) return [{ type: 'endTurn' }]
    const distance = distancesToAttack(state, pawn)
    const reach: ReachCache = new Map()
    const plan = sidePlan(state, pawn.side, options)
    const search: Search = {
      side: pawn.side,
      beamWidth: options.beamWidth,
      budget: POSITION_BUDGET,
      scores: new Map(),
      leaf: (next) => {
        search.budget--
        searchStats.leafEvals++
        return evaluatePosition(next, pawn, plan, distance, reach)
      },
    }
    // Hellfire remains seeded; analysis does not peek into the battle's random stream.
    const analysis = { ...state, randomState: 0 }
    let floor = -Infinity
    const ranked = viableTurns(
      analysis,
      pawn.id,
      introductionTurns(analysis, rankedTurns(analysis, search)),
    )
    const victory = ranked.find((turn) => turn.state.winner === pawn.side)
    if (victory) return victory.actions
    searchStats.rootLeafEvals = searchStats.leafEvals
    const valued = ranked
      .slice(0, options.beamWidth)
      .map((turn) => {
        const value = minimax(
          turn.state,
          options.depth - 1,
          floor,
          Infinity,
          search,
          turn.value,
        )
        floor = Math.max(floor, value - options.latitude)
        // Keep near-term position quality as a small tie-breaker for equal distant outcomes.
        return { ...turn, value: value + turn.value * 0.01 }
      })
      .sort((a, b) => b.value - a.value)
    return chooseOption(analysis, pawn, valued, options).actions
  }
}

function shortlist(state: GameState, plans: TurnPlan[]): TurnPlan[] {
  if (plans.length <= SHORTLIST) return plans
  const side = activePawn(state)!.side
  const foes = state.pawns.filter((pawn) => pawn.side !== side)
  const damage = (plan: TurnPlan) =>
    foes.reduce((sum, foe) => sum + foe.hp - hpOf(plan.state, foe.id), 0)
  const quiet = plans.filter((plan) => !usesAbility(plan))
  const active = plans.filter(usesAbility).sort((a, b) => damage(b) - damage(a))
  return [
    ...quiet.slice(0, SHORTLIST),
    ...active.slice(0, Math.max(0, SHORTLIST - quiet.length)),
  ]
}

function viableTurns(state: GameState, pawnId: number, ranked: ScoredTurn[]): ScoredTurn[] {
  const pawn = state.pawns.find((p) => p.id === pawnId)!
  const survives = (plan: ScoredTurn) => {
    const actor = plan.state.pawns.find((p) => p.id === pawnId)
    if (!actor) return false
    return (
      actor.hp > 1 ||
      plan.state.round !== state.round ||
      !inHellfire(plan.state.hellfire, actor)
    )
  }
  const canSurvive = ranked.some(survives)
  return ranked.filter((turn) => {
    if (turn.value < ranked[0]!.value - VIABLE_SCORE_MARGIN) return false
    if (survives(turn)) return true
    return (
      !canSurvive ||
      (usesAbility(turn) &&
        state.pawns.some((p) => p.side !== pawn.side && hpOf(turn.state, p.id) < p.hp))
    )
  })
}

function score(plan: TurnPlan, search: Search): ScoredTurn {
  const key = positionKey(plan.state)
  let value = search.scores.get(key)
  if (value === undefined) {
    value = search.leaf(plan.state)
    search.scores.set(key, value)
  }
  return { ...plan, value }
}

function rankedTurns(state: GameState, search: Search): ScoredTurn[] {
  const direction = activePawn(state)!.side === search.side ? -1 : 1
  const plans = turnPlans(state)
  searchStats.plansEnumerated += plans.length
  const kept = shortlist(state, plans)
  searchStats.shortlisted += kept.length
  const ranked: ScoredTurn[] = []
  for (const plan of kept) {
    if (search.budget <= 0) {
      searchStats.budgetBreaks++
      return []
    }
    ranked.push(score(plan, search))
  }
  return ranked.sort((a, b) => direction * (a.value - b.value))
}

function lastReply(
  state: GameState,
  alpha: number,
  beta: number,
  maximizing: boolean,
  search: Search,
  fallback: number,
): number {
  const plans = generateTurnPlans(state, true)
  let best = maximizing ? -Infinity : Infinity
  for (const plan of plans) {
    searchStats.plansEnumerated++
    searchStats.shortlisted++
    if (search.budget <= 0) {
      searchStats.budgetBreaks++
      break
    }
    const before = searchStats.leafEvals
    const { value } = score(plan, search)
    searchStats.replyLeafEvals += searchStats.leafEvals - before
    best = maximizing ? Math.max(best, value) : Math.min(best, value)
    if (maximizing ? best >= beta : best <= alpha) {
      searchStats.cutoffs++
      break
    }
  }
  return Number.isFinite(best) ? best : fallback
}

// Every ability has one reliable outcome: ordinary alpha-beta over unit activations.
function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  search: Search,
  fallback: number,
): number {
  if (search.budget <= 0) {
    searchStats.budgetBreaks++
    return fallback
  }
  if (depth === 0 || state.winner || !activePawn(state)) return fallback
  searchStats.maxDepth = Math.max(searchStats.maxDepth, depth)
  const maximizing = activePawn(state)!.side === search.side
  if (depth === 1) return lastReply(state, alpha, beta, maximizing, search, fallback)
  const before = searchStats.leafEvals
  const turns = rankedTurns(state, search)
  searchStats.deepLeafEvals += searchStats.leafEvals - before
  if (!turns.length) return fallback
  let best = maximizing ? -Infinity : Infinity
  for (const turn of turns.slice(0, search.beamWidth)) {
    searchStats.beamExpansions++
    const value = minimax(turn.state, depth - 1, alpha, beta, search, turn.value)
    if (maximizing) {
      best = Math.max(best, value)
      alpha = Math.max(alpha, best)
    } else {
      best = Math.min(best, value)
      beta = Math.min(beta, best)
    }
    if (alpha >= beta) {
      searchStats.cutoffs++
      break
    }
  }
  return best
}
