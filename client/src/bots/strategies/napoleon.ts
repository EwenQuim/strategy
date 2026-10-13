import { activePawn, type Action, type GameState } from '../../lib/engine/engine.ts'
import type { Pawn, Side } from '../../lib/engine/pawns/index.ts'
import { distancesToAttack, evaluatePosition } from '../../lib/engine/ai/evaluate.ts'
import { introductionTurns } from '../introductions.ts'
import { evaluateArmy, type ArmyCache } from '../../lib/engine/ai/army.ts'
import { positionKey, turnPlans, type TurnPlan } from '../../lib/engine/ai/turns.ts'
import { turnOpening, type Bot } from '../bot.ts'
import { intInRange, numberInRange, optionsMatch, readOptions } from '../options.ts'

type NapoleonOptions = {
  candidates: number
  replies: number
  aggression: number
  caution: number
}

export const NAPOLEON_LEVELS = {
  easy: { candidates: 3, replies: 1, aggression: 1.2, caution: 0.35 },
  normal: { candidates: 6, replies: 1, aggression: 1, caution: 0.8 },
  hard: { candidates: 8, replies: 2, aggression: 1, caution: 1 },
  brutal: { candidates: 12, replies: 3, aggression: 1.2, caution: 1 },
} as const satisfies Record<string, NapoleonOptions>

const NAPOLEON_CHECKS: Record<string, (value: unknown) => boolean> = {
  candidates: intInRange(1, 24),
  replies: intInRange(1, 4),
  aggression: numberInRange(0.25, 3),
  caution: numberInRange(0, 2),
}

type ScoredTurn = TurnPlan & { value: number }
type Analysis = {
  cache: ArmyCache
  scores: Map<string, number>
  turns: Map<string, ScoredTurn[]>
  options: Readonly<NapoleonOptions>
  actor: Pawn
  distance: Map<string, number>
  budget: number
}

// Complete iterations give every candidate the same tactical horizon. A full initiative-cycle
// forecast breaks close ties without letting an optimistic rollout overrule a tactical loss.
export class NapoleonBot implements Bot<NapoleonOptions> {
  readonly name = 'napoleon'
  readonly options: Readonly<NapoleonOptions>

  constructor(options: Partial<NapoleonOptions> = {}) {
    this.options = readOptions<NapoleonOptions>(NAPOLEON_LEVELS.normal, options)
    if (!optionsMatch(this.options, NAPOLEON_CHECKS))
      throw new RangeError('Invalid Napoleon options')
  }

  async chooseActions(state: GameState): Promise<Action[]> {
    const { pawn: actor, forced } = turnOpening(state)
    if (forced) return forced
    const analysis: Analysis = {
      cache: { reach: new Map(), distances: new WeakMap() },
      scores: new Map(),
      turns: new Map(),
      options: this.options,
      actor,
      distance: distancesToAttack(state, actor),
      budget: 1200 * this.options.replies,
    }
    // Never inspect the real stream to predict future Hellfire centers.
    const position = { ...state, randomState: 0 }
    const roots = introductionTurns(position, rankedTurns(position, analysis))
    const victory = roots.find((turn) => turn.state.winner === actor.side)
    if (victory) return victory.actions
    let ranked = roots.slice(0, this.options.candidates)
    for (let depth = 1; depth <= this.options.replies + 1; depth++) {
      const iteration: ScoredTurn[] = []
      let alpha = -Infinity
      for (const root of ranked) {
        const value = search(root.state, depth, alpha, Infinity, analysis)
        if (value === null) break
        iteration.push({ ...root, value: value + score(root.state, analysis) * 0.01 })
        alpha = Math.max(alpha, value)
      }
      if (iteration.length !== ranked.length) break
      ranked = iteration.sort((a, b) => b.value - a.value)
    }
    // Only close tactical alternatives need a longer strategic forecast.
    let best = ranked[0]!
    let bestValue = -Infinity
    for (const root of ranked
      .filter((turn) => turn.value >= ranked[0]!.value - 2)
      .slice(0, 3)) {
      const forecast = rollout(root.state, actor.id, actor.side, analysis)
      const value = root.value + Math.max(-50, Math.min(50, forecast)) * 0.02
      if (value > bestValue) {
        best = root
        bestValue = value
      }
    }
    return best.actions
  }
}

function score(state: GameState, analysis: Analysis): number {
  const signature = positionKey(state)
  let value = analysis.scores.get(signature)
  if (value === undefined) {
    analysis.budget--
    const idle = Math.max(0, state.round - state.lastClashRound - 2)
    value = evaluatePosition(
      state,
      analysis.actor,
      {
        caution: analysis.options.caution,
        aggression: analysis.options.aggression * (1 + idle * 0.25),
      },
      analysis.distance,
      analysis.cache.reach,
    )
    analysis.scores.set(signature, value)
  }
  return value
}

function rankedTurns(state: GameState, analysis: Analysis): ScoredTurn[] {
  const signature = positionKey(state)
  const cached = analysis.turns.get(signature)
  if (cached) return cached
  const maximizing = activePawn(state)!.side === analysis.actor.side
  const plans = turnPlans(state)
  // Always retain every quiet endpoint and give signature outcomes their own quota.
  const quiet = plans.filter((turn) => !turn.actions.some((a) => a.type === 'special'))
  const active = plans
    .filter((turn) => turn.actions.some((a) => a.type === 'special'))
    .map((turn) => ({
      ...turn,
      value: evaluateArmy(
        turn.state,
        activePawn(state)!.side,
        analysis.options,
        analysis.cache,
        false,
      ),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 160)
  const ranked = [...quiet, ...active]
    .map((turn) => ({ ...turn, value: score(turn.state, analysis) }))
    .sort((a, b) => (maximizing ? b.value - a.value : a.value - b.value))
  analysis.turns.set(signature, ranked)
  return ranked
}

function search(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  analysis: Analysis,
): number | null {
  if (state.winner || depth === 0) return score(state, analysis)
  if (analysis.budget <= 0) return null
  const maximizing = activePawn(state)!.side === analysis.actor.side
  const turns = rankedTurns(state, analysis)
  if (analysis.budget <= 0) return null
  let best = maximizing ? -Infinity : Infinity
  const width = Math.max(3, analysis.options.replies * 2)
  for (const turn of turns.slice(0, depth === 1 ? turns.length : width)) {
    const value =
      depth === 1 ? turn.value : search(turn.state, depth - 1, alpha, beta, analysis)
    if (value === null) return null
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

function rollout(state: GameState, actorId: number, side: Side, analysis: Analysis): number {
  let next = state
  for (
    let turn = 0;
    turn < state.order.length && !next.winner && activePawn(next)?.id !== actorId;
    turn++
  ) {
    const actor = activePawn(next)!
    const plans = introductionTurns(next, turnPlans(next, 4))
    let best = plans[0]!,
      bestValue = -Infinity
    for (const plan of plans) {
      const value = evaluateArmy(
        plan.state,
        actor.side,
        analysis.options,
        analysis.cache,
        false,
      )
      if (value > bestValue) {
        best = plan
        bestValue = value
      }
    }
    next = best.state
  }
  return evaluateArmy(next, side, analysis.options, analysis.cache, false)
}
