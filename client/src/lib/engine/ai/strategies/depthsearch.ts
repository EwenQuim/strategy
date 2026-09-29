import { activePawn, reducer, type Action, type GameState } from '../../engine.ts'
import type { Pawn, Side } from '../../pawns/index.ts'
import type { BotOptions } from '../../ai.ts'
import { distancesToAttack, evaluatePosition, type ReachCache } from '../evaluate.ts'
import { sidePlan } from '../plan.ts'
import { chooseOption, hpOf, type Outcome } from '../choice.ts'
import { positionKey, turnPlans, type TurnPlan } from '../turns.ts'
import type { AiStrategy } from '../decision.ts'

function withFoeEscape(state: GameState, side: Side, escape: (foe: Pawn) => number): GameState {
  return {
    ...state,
    pawns: state.pawns.map((pawn) => {
      if (pawn.side === side) return pawn
      const foe = pawn.clone()
      foe.escapeChance = escape(pawn)
      return foe
    }),
  }
}

const rolls = (action: Action) =>
  action.type === 'attack' || (action.type === 'special' && !!action.target)
const END_TURN: Action = { type: 'endTurn' }

// Forcing escapes only lasts for the roll: the real chances come back unless a new round began and
// reset every escape chance anyway.
function restoreEscapes(before: GameState, after: GameState, side: Side): GameState {
  if (after.round !== before.round) return after
  const escapes = new Map(before.pawns.map((pawn) => [pawn.id, pawn.escapeChance]))
  return withFoeEscape(after, side, (foe) => escapes.get(foe.id) ?? foe.escapeChance)
}

function rollOutcomes(current: GameState, action: Action, side: Side): Outcome[] {
  const forced = (escape: number) => {
    const world = withFoeEscape(current, side, (foe) => (foe.escapeChance > 0 ? escape : 0))
    const next = reducer(world, action)
    return next === world ? null : restoreEscapes(current, next, side)
  }
  const hit = forced(0)
  if (!hit) return [{ state: current, weight: 1 }]
  const dodge = forced(100)!
  const struck = current.pawns.filter(
    (foe) => foe.side !== side && hpOf(hit, foe.id) !== hpOf(dodge, foe.id),
  )
  if (!struck.length) return [{ state: hit, weight: 1 }]
  const escape = struck.reduce((sum, foe) => sum + foe.escapeChance, 0) / struck.length / 100
  return [
    { state: hit, weight: 1 - escape },
    { state: dodge, weight: escape },
  ]
}

// A turn planned in the all-hit world is replayed with each roll at its own odds: three attacks
// at 20% escape all land 51.2% of the time, not 80%. Every outcome finishes the turn, and equal
// positions merge. Area specials keep one averaged roll per blast.
export function turnOutcomes(state: GameState, plan: TurnPlan): Outcome[] {
  const actor = activePawn(state)!
  const side = actor.side
  if (!state.pawns.some((p) => p.side !== side && p.escapeChance > 0))
    return [{ state: plan.state, weight: 1 }]
  if (!plan.actions.some(rolls))
    return [{ state: restoreEscapes(state, plan.state, side), weight: 1 }]
  const playing = (current: GameState) =>
    !current.winner && activePawn(current)?.id === actor.id
  let branches: Outcome[] = [{ state, weight: 1 }]
  for (const action of plan.actions)
    branches = branches.flatMap((branch) => {
      if (!playing(branch.state)) return [branch]
      if (rolls(action))
        return rollOutcomes(branch.state, action, side).map((outcome) => ({
          state: outcome.state,
          weight: branch.weight * outcome.weight,
        }))
      const next = reducer(branch.state, action)
      return [{ state: next, weight: branch.weight }]
    })
  const merged = new Map<string, Outcome>()
  for (const branch of branches) {
    const ended = playing(branch.state) ? reducer(branch.state, END_TURN) : branch.state
    const position = positionKey(ended)
    const known = merged.get(position)
    if (known) known.weight += branch.weight
    else merged.set(position, { state: ended, weight: branch.weight })
  }
  return [...merged.values()]
}

type Scored = Outcome & { score: number }
type ScoredTurn = { actions: Action[]; outcomes: Scored[]; value: number }

const expectedScores = (outcomes: Scored[], value: (outcome: Scored) => number) =>
  outcomes.reduce((sum, outcome) => sum + outcome.weight * value(outcome), 0)

type Search = {
  side: Side
  beamWidth: number
  budget: number
  leaf: (state: GameState) => number
}

// Per-decision search shape, reset on every chooseTacticalActions call and read by the analysis
// harness in tests/analyze-ai.ts. Plain counters only, so they stay free in production.
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

// Once a decision has scored this many positions it stops expanding and reuses the scores it
// already has. With the shortlist below, a decision scores at most the budget plus one node's
// shortlist. A count, not a clock, keeps decisions deterministic.
const POSITION_BUDGET = 1500
const SHORTLIST = 200

// Rune-boosted units with many targets can plan thousands of turns. Every turn without a roll is
// kept, then the attacking turns that deal the most damage if every blow lands.
function shortlist(state: GameState, plans: TurnPlan[]): TurnPlan[] {
  if (plans.length <= SHORTLIST) return plans
  const side = activePawn(state)!.side
  const foes = state.pawns.filter((p) => p.side !== side)
  const damage = (plan: TurnPlan) =>
    foes.reduce((sum, foe) => sum + foe.hp - hpOf(plan.state, foe.id), 0)
  const quiet = plans.filter((plan) => !plan.actions.some(rolls))
  const attacking = plans
    .filter((plan) => plan.actions.some(rolls))
    .sort((a, b) => damage(b) - damage(a))
  return [...quiet, ...attacking.slice(0, Math.max(0, SHORTLIST - quiet.length))]
}

function scoreTurn(state: GameState, plan: TurnPlan, search: Search): ScoredTurn {
  const outcomes = turnOutcomes(state, plan).map((outcome) => ({
    ...outcome,
    score: search.leaf(outcome.state),
  }))
  return {
    actions: plan.actions,
    outcomes,
    value: expectedScores(outcomes, (outcome) => outcome.score),
  }
}

// Turns are enumerated as if every attack lands, then valued over their roll outcomes.
function rankedTurns(state: GameState, search: Search): ScoredTurn[] {
  const side = activePawn(state)!.side
  const direction = side === search.side ? -1 : 1
  const enumerated = turnPlans(withFoeEscape(state, side, () => 0))
  searchStats.plansEnumerated += enumerated.length
  const kept = shortlist(state, enumerated)
  searchStats.shortlisted += kept.length
  return kept
    .map((plan) => scoreTurn(state, plan, search))
    .sort((a, b) => direction * (a.value - b.value))
}

// On the last ply only the best turn matters, so turns with an attack or special go first and the
// scan stops as soon as one is good enough for a cutoff or the budget runs out.
function lastReply(
  state: GameState,
  alpha: number,
  beta: number,
  maximizing: boolean,
  search: Search,
  fallback: number,
): number {
  const side = activePawn(state)!.side
  const plans = shortlist(state, turnPlans(withFoeEscape(state, side, () => 0))).sort(
    (a, b) => Number(b.actions.some(rolls)) - Number(a.actions.some(rolls)),
  )
  searchStats.plansEnumerated += plans.length
  searchStats.shortlisted += plans.length
  let best = maximizing ? -Infinity : Infinity
  for (const plan of plans) {
    if (search.budget <= 0) {
      searchStats.budgetBreaks++
      break
    }
    const before = searchStats.leafEvals
    const { value } = scoreTurn(state, plan, search)
    searchStats.replyLeafEvals += searchStats.leafEvals - before
    best = maximizing ? Math.max(best, value) : Math.min(best, value)
    if (maximizing ? best >= beta : best <= alpha) {
      searchStats.cutoffs++
      break
    }
  }
  return Number.isFinite(best) ? best : fallback
}

// Minimax over unit turns: the searching side maximizes, the other minimizes, with alpha-beta
// cutoffs. Turns with several roll outcomes average them, so they search with a full window. A
// spent budget returns the score this position already received.
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
  const beforeRanking = searchStats.leafEvals
  const turns = rankedTurns(state, search)
  searchStats.deepLeafEvals += searchStats.leafEvals - beforeRanking
  if (!turns.length) return fallback
  let best = maximizing ? -Infinity : Infinity
  for (const turn of turns.slice(0, search.beamWidth)) {
    searchStats.beamExpansions++
    const value =
      turn.outcomes.length === 1
        ? minimax(turn.outcomes[0].state, depth - 1, alpha, beta, search, turn.value)
        : expectedScores(turn.outcomes, (outcome) =>
            minimax(outcome.state, depth - 1, -Infinity, Infinity, search, outcome.score),
          )
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

// Plays the chosen turn up to its first attack or special, then decides again with the result.
function untilFirstRoll(actions: Action[]): Action[] {
  const roll = actions.findIndex(rolls)
  return roll < 0 ? actions : actions.slice(0, roll + 1)
}

function chooseTacticalActions(state: GameState, options: BotOptions): Action[] {
  Object.assign(searchStats, {
    decisions: 1,
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
  })
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
    leaf: (next) => {
      search.budget--
      searchStats.leafEvals++
      return evaluatePosition(next, pawn, plan, distance, reach)
    },
  }
  // A fixed random stream keeps the analysis from seeing the battle's future rolls, such as Hellfire.
  const analysis = { ...state, randomState: 0 }
  let floor = -Infinity
  const ranked = rankedTurns(analysis, search)
  searchStats.rootLeafEvals = searchStats.leafEvals
  const valued = ranked
    .slice(0, options.beamWidth)
    .map((turn) => {
      const window = turn.outcomes.length === 1 ? floor : -Infinity
      const value = expectedScores(turn.outcomes, (outcome) =>
        minimax(outcome.state, options.depth - 1, window, Infinity, search, outcome.score),
      )
      floor = Math.max(floor, value - options.latitude)
      return { ...turn, value }
    })
    .sort((a, b) => b.value - a.value)
  return untilFirstRoll(chooseOption(analysis, pawn, valued, options).actions)
}

// The depth search: budgeted beam minimax over the unit turns turns.ts enumerates.
export const depthsearch: AiStrategy = {
  id: 'depthsearch',
  chooseActions: chooseTacticalActions,
}
