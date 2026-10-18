import { activePawn, type Action, type GameState } from '../lib/engine/engine.ts'
import type { Pawn, Side } from '../lib/engine/pawns/index.ts'
import { positionKey, turnPlans } from '../lib/engine/ai/turns.ts'
import { introductionTurns } from './introductions.ts'
import { outcome, valueFeatures, type ValueCache } from './valueFeatures.ts'
import { predictValue, VALUE_MODELS } from './valueModel.ts'
import { intInRange, numberInRange, oneOf, optionsMatch, readOptions } from './options.ts'
import { turnOpening, type Bot } from './bot.ts'

export type LearnedSearchOptions = {
  model: keyof typeof VALUE_MODELS
  simulations: number
  candidates: number
  exploration: number
  horizon: number
  backup: 'average' | 'minimax'
  pressure: number
}

const LEARNED_SEARCH_CHECKS: Record<string, (value: unknown) => boolean> = {
  model: oneOf(Object.keys(VALUE_MODELS)),
  simulations: intInRange(1, 16384),
  candidates: intInRange(2, 96),
  exploration: numberInRange(0, 5),
  horizon: intInRange(2, 64),
  backup: oneOf(['average', 'minimax']),
  pressure: numberInRange(0, 1),
}

export type SearchNode = {
  state: GameState
  actions: Action[]
  prior: number
  visits: number
  total: number
  value: number
  children?: SearchNode[]
  solved?: number
  complete?: boolean
}
export type Search = {
  side: Side
  weights: readonly number[]
  cache: ValueCache
  values: Map<string, number>
  options: Readonly<LearnedSearchOptions>
}

// PUCT over complete activations. Values always belong to the root side; selection follows
// actual initiative ownership, including consecutive activations by the same side.
export abstract class LearnedSearchBot implements Bot<LearnedSearchOptions> {
  abstract readonly name: string
  readonly options: Readonly<LearnedSearchOptions>
  protected readonly weights: readonly number[]

  protected constructor(
    defaults: LearnedSearchOptions,
    options: Partial<LearnedSearchOptions>,
    candidateWeights?: readonly number[],
  ) {
    this.options = readOptions<LearnedSearchOptions>(defaults, options)
    if (!optionsMatch(this.options, LEARNED_SEARCH_CHECKS))
      throw new RangeError('Invalid learned search options')
    const weights = candidateWeights ?? VALUE_MODELS[this.options.model]
    if (
      weights.length !== VALUE_MODELS[this.options.model].length ||
      !weights.every(Number.isFinite)
    )
      throw new RangeError('Invalid learned value weights')
    this.weights = Object.freeze([...weights])
  }

  async chooseActions(state: GameState): Promise<Action[]> {
    const { pawn: actor, forced } = turnOpening(state)
    if (forced) return forced
    const search: Search = {
      side: actor.side,
      weights: this.weights,
      cache: { reach: new Map() },
      values: new Map(),
      options: this.options,
    }
    const root = node({ ...state, randomState: 0 }, [], 1, search)
    const children = this.expandRoot(root, search)
    const victory = children.find((child) => child.state.winner === actor.side)
    if (victory) return victory.actions
    for (let i = 0; i < this.options.simulations; i++) simulate(root, search)
    const king = state.pawns.find((p) => p.side === actor.side && p.kind === 'king')!
    // Reject an immediately demonstrated regicide by the next enemy actor; do not trust a learned
    // probability to average away an available winning enemy reply.
    const candidates = children.filter((child) => !losesKing(child.state, king.id, actor.side))
    const choices = candidates.length ? candidates : children
    return this.select(choices, actor, state).actions
  }

  // Root candidates the simulations refine. Subclasses may prune or rescore them, but must keep
  // every immediate victory and keep root.children in sync for the simulation walk.
  protected expandRoot(root: SearchNode, search: Search): SearchNode[] {
    expand(root, search)
    return root.children!
  }

  // Each learned searcher owns its final pick among the searched candidates.
  protected abstract select(children: SearchNode[], actor: Pawn, state: GameState): SearchNode
}

export function value(state: GameState, search: Search, tactical = true): number {
  const ended = outcome(state, search.side)
  if (ended !== null) return ended
  const signature = `${positionKey(state)}:${tactical}`
  let result = search.values.get(signature)
  if (result === undefined) {
    result = predictValue(
      valueFeatures(state, search.side, search.cache, tactical),
      search.weights,
    )
    search.values.set(signature, result)
  }
  return result
}

function node(state: GameState, actions: Action[], prior: number, search: Search): SearchNode {
  return {
    state,
    actions,
    prior,
    visits: 0,
    total: 0,
    value: value(state, search),
    solved: outcome(state, search.side) ?? undefined,
  }
}

function losesKing(state: GameState, kingId: number, side: Side): boolean {
  if (state.winner) return state.winner !== side && state.winner !== 'draw'
  const actor = activePawn(state)!
  if (actor.side === side || actor.id === kingId) return false
  return turnPlans(state).some((plan) => plan.state.winner === actor.side)
}

function expand(parent: SearchNode, search: Search): void {
  const owner = activePawn(parent.state)!.side
  const direction = owner === search.side ? 1 : -1
  const plans = introductionTurns(parent.state, turnPlans(parent.state))
  const ranked = plans
    .map((plan) => ({ ...plan, value: value(plan.state, search, false) }))
    .sort((a, b) => direction * (b.value - a.value))
  // Cover alternative targets before filling the shortlist with equivalent retreats.
  const selected = new Set(ranked.slice(0, search.options.candidates))
  const targets = new Set<string>()
  for (const plan of ranked) {
    const special = plan.actions.find((action) => action.type === 'special')
    if (!special) continue
    const signature = JSON.stringify(special)
    if (targets.has(signature)) continue
    targets.add(signature)
    selected.add(plan)
    if (targets.size >= search.options.candidates) break
  }
  const children = [...selected]
    .map((plan) => node(plan.state, plan.actions, 0, search))
    .sort((a, b) => direction * (b.value - a.value))
    .slice(0, search.options.candidates)
  parent.complete = children.length === plans.length
  const priors = children.map((child) => Math.exp(direction * child.value * 5))
  const sum = priors.reduce((total, prior) => total + prior, 0)
  parent.children = children.map((child, index) => ({ ...child, prior: priors[index] / sum }))
}

function simulate(root: SearchNode, search: Search): void {
  const path = [root]
  let current = root
  while (!current.state.winner && path.length <= search.options.horizon) {
    if (!current.children) {
      expand(current, search)
      break
    }
    const maximizing = activePawn(current.state)!.side === search.side
    const score = (child: SearchNode) => {
      const mean =
        child.solved ??
        (search.options.backup === 'minimax'
          ? child.value
          : child.visits
            ? child.total / child.visits
            : child.value)
      return (
        (maximizing ? mean : 1 - mean) +
        (search.options.exploration * child.prior * Math.sqrt(current.visits + 1)) /
          (1 + child.visits)
      )
    }
    current = current.children.reduce((best, child) =>
      score(child) > score(best) ? child : best,
    )
    path.push(current)
    if (!current.visits) break
  }
  const leaf = current.value
  for (const visited of path.toReversed()) {
    visited.visits++
    visited.total += leaf
    if (search.options.backup === 'minimax' && visited.children) {
      const values = visited.children.map((child) => child.value)
      visited.value =
        activePawn(visited.state)!.side === search.side
          ? Math.max(...values)
          : Math.min(...values)
    }
    if (visited.children) {
      const desired = activePawn(visited.state)!.side === search.side ? 1 : 0
      if (visited.children.some((child) => child.solved === desired)) visited.solved = desired
      else if (
        visited.complete &&
        visited.children.every((child) => child.solved !== undefined)
      ) {
        const values = visited.children.map((child) => child.solved!)
        visited.solved = desired === 1 ? Math.max(...values) : Math.min(...values)
      }
    }
  }
}
