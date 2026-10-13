import { activePawn, type Action, type GameState } from '../../lib/engine/engine.ts'
import type { Side } from '../../lib/engine/pawns/index.ts'
import { positionKey, turnPlans } from '../../lib/engine/ai/turns.ts'
import { hexDist } from '../../lib/engine/hex.ts'
import { introductionTurns } from '../introductions.ts'
import { outcome, valueFeatures, type ValueCache } from '../valueFeatures.ts'
import { predictValue, VALUE_MODELS } from '../valueModel.ts'
import { readOptions } from '../options.ts'
import type { Bot } from '../bot.ts'

type HannibalOptions = {
  model: keyof typeof VALUE_MODELS
  simulations: number
  candidates: number
  exploration: number
  horizon: number
  backup: 'average' | 'minimax'
  pressure: number
}

export const HANNIBAL_LEVELS = {
  easy: {
    model: 'league-v1',
    simulations: 32,
    candidates: 8,
    exploration: 1.4,
    horizon: 12,
    backup: 'average',
    pressure: 0.1,
  },
  normal: {
    model: 'league-v1',
    simulations: 128,
    candidates: 16,
    exploration: 1.4,
    horizon: 16,
    backup: 'average',
    pressure: 0.1,
  },
  hard: {
    model: 'league-v1',
    simulations: 512,
    candidates: 20,
    exploration: 1.4,
    horizon: 24,
    backup: 'average',
    pressure: 0.1,
  },
  brutal: {
    model: 'league-v1',
    simulations: 2048,
    candidates: 32,
    exploration: 1.4,
    horizon: 32,
    backup: 'average',
    pressure: 0.1,
  },
} as const satisfies Record<string, HannibalOptions>

type Node = {
  state: GameState
  actions: Action[]
  prior: number
  visits: number
  total: number
  value: number
  children?: Node[]
  solved?: number
  complete?: boolean
}
type Search = {
  side: Side
  weights: readonly number[]
  cache: ValueCache
  values: Map<string, number>
  options: Readonly<HannibalOptions>
}

// PUCT over complete activations. Values always belong to the root side; selection follows
// actual initiative ownership, including consecutive activations by the same side.
export class HannibalBot implements Bot<HannibalOptions> {
  readonly name = 'hannibal'
  readonly options: Readonly<HannibalOptions>
  private readonly weights: readonly number[]

  constructor(options: Partial<HannibalOptions> = {}, candidateWeights?: readonly number[]) {
    this.options = readOptions<HannibalOptions>(HANNIBAL_LEVELS.normal, options)
    const { model, simulations, candidates, exploration, horizon, backup, pressure } =
      this.options
    if (
      !Object.hasOwn(VALUE_MODELS, model) ||
      !Number.isInteger(simulations) ||
      simulations < 1 ||
      simulations > 16384 ||
      !Number.isInteger(candidates) ||
      candidates < 2 ||
      candidates > 96 ||
      !Number.isFinite(exploration) ||
      exploration < 0 ||
      exploration > 5 ||
      !Number.isInteger(horizon) ||
      horizon < 2 ||
      horizon > 64 ||
      !['average', 'minimax'].includes(backup) ||
      !Number.isFinite(pressure) ||
      pressure < 0 ||
      pressure > 1
    )
      throw new RangeError('Invalid Hannibal options')
    const weights = candidateWeights ?? VALUE_MODELS[model]
    if (weights.length !== VALUE_MODELS[model].length || !weights.every(Number.isFinite))
      throw new RangeError('Invalid learned value weights')
    this.weights = Object.freeze([...weights])
  }

  async chooseActions(state: GameState): Promise<Action[]> {
    const actor = activePawn(state)
    if (!actor || state.winner) return []
    if (actor.energy <= 0) return [{ type: 'endTurn' }]
    const search: Search = {
      side: actor.side,
      weights: this.weights,
      cache: { reach: new Map() },
      values: new Map(),
      options: this.options,
    }
    const root = node({ ...state, randomState: 0 }, [], 1, search)
    expand(root, search)
    const victory = root.children!.find((child) => child.state.winner === actor.side)
    if (victory) return victory.actions
    for (let i = 0; i < this.options.simulations; i++) simulate(root, search)
    const king = state.pawns.find((p) => p.side === actor.side && p.kind === 'king')!
    // Reject an immediately demonstrated regicide by the next enemy actor; do not trust a learned
    // probability to average away an available winning enemy reply.
    const candidates = root.children!.filter(
      (child) => !losesKing(child.state, king.id, actor.side),
    )
    const choices = candidates.length ? candidates : root.children!
    const target = state.pawns.find((p) => p.side !== actor.side && p.kind === 'king')!
    const idle = Math.max(0, state.round - state.lastClashRound - 2)
    const utility = (child: Node) => {
      const mean = child.solved ?? (child.visits ? child.total / child.visits : child.value)
      const pawn = child.state.pawns.find((p) => p.id === actor.id)
      const progress = pawn ? (hexDist(actor, target) - hexDist(pawn, target)) / 12 : 0
      return mean + Math.min(0.15, idle * this.options.pressure) * progress
    }
    return choices.toSorted(
      (a, b) =>
        (b.solved === 1 ? 1 : 0) - (a.solved === 1 ? 1 : 0) ||
        (a.solved === 0 ? 1 : 0) - (b.solved === 0 ? 1 : 0) ||
        (idle > 0
          ? utility(b) - utility(a)
          : this.options.backup === 'minimax'
            ? b.value - a.value || b.visits - a.visits
            : b.visits - a.visits || b.value - a.value),
    )[0].actions
  }
}

function value(state: GameState, search: Search, tactical = true): number {
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

function node(state: GameState, actions: Action[], prior: number, search: Search): Node {
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

function expand(parent: Node, search: Search): void {
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

function simulate(root: Node, search: Search): void {
  const path = [root]
  let current = root
  while (!current.state.winner && path.length <= search.options.horizon) {
    if (!current.children) {
      expand(current, search)
      break
    }
    const maximizing = activePawn(current.state)!.side === search.side
    const score = (child: Node) => {
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
