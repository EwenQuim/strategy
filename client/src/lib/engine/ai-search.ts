import { activePawn, reducer, type Action, type GameState } from './engine.ts'
import type { Pawn, Side } from './pawns/index.ts'
import type { BotOptions } from './ai.ts'
import { distancesToAttack, evaluatePosition, type ReachCache } from './ai-evaluate.ts'
import { sidePlan } from './ai-plan.ts'
import { chooseOption, expected, hpOf, type Option, type Outcome } from './ai-choice.ts'
import { turnPlans, type TurnPlan } from './ai-turns.ts'

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

const rolls = (action: Action) => action.type === 'attackAt' || action.type === 'specialAt'

// Escape rolls are scored by their odds: a 20% escape keeps 80% of the hit's value. Plans come
// from the world where every attack lands, so only the escaped outcome needs replaying.
function expectedOutcomes(state: GameState, plan: TurnPlan): Outcome[] {
  const side = activePawn(state)!.side
  const foes = state.pawns.filter((p) => p.side !== side && p.escapeChance > 0)
  if (!foes.length) return [{ state: plan.state, weight: 1 }]
  const escapes = new Map(foes.map((foe) => [foe.id, foe.escapeChance]))
  const restore = (next: GameState) =>
    withFoeEscape(next, side, (foe) => escapes.get(foe.id) ?? foe.escapeChance)
  const hit = restore(plan.state)
  if (!plan.actions.some(rolls)) return [{ state: hit, weight: 1 }]
  const dodged = withFoeEscape(state, side, (foe) => (escapes.has(foe.id) ? 100 : 0))
  const dodge = restore(plan.actions.reduce(reducer, dodged))
  const struck = foes.filter((foe) => hpOf(hit, foe.id) !== hpOf(dodge, foe.id))
  if (!struck.length) return [{ state: hit, weight: 1 }]
  const escape = struck.reduce((sum, foe) => sum + foe.escapeChance, 0) / struck.length / 100
  return [
    { state: hit, weight: 1 - escape },
    { state: dodge, weight: escape },
  ]
}

type Search = {
  side: Side
  beamWidth: number
  budget: number
  leaf: (state: GameState) => number
}

// Caps the positions one decision scores, so the worst case stays short on large battles. Once
// spent, deeper branches fall back to the static score. A count keeps decisions deterministic.
const POSITION_BUDGET = 1500

// Turns are enumerated as if every attack lands, then valued over their hit and escape outcomes.
function rankedTurns(state: GameState, search: Search): Option[] {
  const side = activePawn(state)!.side
  const direction = side === search.side ? -1 : 1
  return turnPlans(withFoeEscape(state, side, () => 0))
    .map((plan) => {
      const outcomes = expectedOutcomes(state, plan)
      return { actions: plan.actions, outcomes, value: expected(outcomes, search.leaf) }
    })
    .sort((a, b) => direction * (a.value - b.value))
}

// On the last ply only the best turn matters, so turns with an attack or special go first and the
// scan stops as soon as one is good enough for a cutoff.
function lastReply(
  state: GameState,
  alpha: number,
  beta: number,
  maximizing: boolean,
  search: Search,
): number {
  const side = activePawn(state)!.side
  const plans = turnPlans(withFoeEscape(state, side, () => 0)).sort(
    (a, b) => Number(b.actions.some(rolls)) - Number(a.actions.some(rolls)),
  )
  let best = maximizing ? -Infinity : Infinity
  for (const plan of plans) {
    const value = expected(expectedOutcomes(state, plan), search.leaf)
    best = maximizing ? Math.max(best, value) : Math.min(best, value)
    if (maximizing ? best >= beta : best <= alpha) break
  }
  return plans.length ? best : search.leaf(state)
}

// Minimax over unit turns: the searching side maximizes, the other minimizes, with alpha-beta
// cutoffs. Turns with escape rolls average their outcomes, so they search with a full window.
function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  search: Search,
): number {
  if (depth === 0 || state.winner || !activePawn(state) || search.budget <= 0)
    return search.leaf(state)
  const maximizing = activePawn(state)!.side === search.side
  if (depth === 1) return lastReply(state, alpha, beta, maximizing, search)
  const turns = rankedTurns(state, search)
  if (!turns.length) return search.leaf(state)
  let best = maximizing ? -Infinity : Infinity
  for (const turn of turns.slice(0, search.beamWidth)) {
    const value =
      turn.outcomes.length === 1
        ? minimax(turn.outcomes[0].state, depth - 1, alpha, beta, search)
        : expected(turn.outcomes, (next) =>
            minimax(next, depth - 1, -Infinity, Infinity, search),
          )
    if (maximizing) {
      best = Math.max(best, value)
      alpha = Math.max(alpha, best)
    } else {
      best = Math.min(best, value)
      beta = Math.min(beta, best)
    }
    if (alpha >= beta) break
  }
  return best
}

// Plays the chosen turn up to its first attack or special, then decides again with the result.
function untilFirstRoll(state: GameState, actions: Action[]): Action[] {
  let current = state
  for (const [index, action] of actions.entries()) {
    current = reducer(current, action)
    if ((action.type === 'attackAt' || action.type === 'specialAt') && current.phase === 'move')
      return actions.slice(0, index + 1)
  }
  return actions
}

export function chooseTacticalActions(state: GameState, options: BotOptions): Action[] {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  if (state.phase !== 'move') return [{ type: 'cancelTargeting' }]
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
      return evaluatePosition(next, pawn, plan, distance, reach)
    },
  }
  // A fixed random stream keeps the analysis from seeing the battle's future rolls, such as Hellfire.
  const analysis = { ...state, randomState: 0 }
  let floor = -Infinity
  const valued = rankedTurns(analysis, search)
    .slice(0, options.beamWidth)
    .map((turn) => {
      const window = turn.outcomes.length === 1 ? floor : -Infinity
      const value = expected(turn.outcomes, (next) =>
        minimax(next, options.depth - 1, window, Infinity, search),
      )
      floor = Math.max(floor, value - options.latitude)
      return { ...turn, value }
    })
    .sort((a, b) => b.value - a.value)
  return untilFirstRoll(analysis, chooseOption(analysis, pawn, valued, options).actions)
}
