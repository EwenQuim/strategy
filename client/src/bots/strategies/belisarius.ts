import { activePawn, type GameState } from '../../lib/engine/engine.ts'
import type { Pawn } from '../../lib/engine/pawns/index.ts'
import { hexDist } from '../../lib/engine/hex.ts'
import { turnPlans, type TurnPlan } from '../../lib/engine/ai/turns.ts'
import { hpOf } from '../../lib/engine/ai/choice.ts'
import { introductionTurns } from '../introductions.ts'
import { outcome } from '../valueFeatures.ts'
import {
  LearnedSearchBot,
  type LearnedSearchOptions,
  type Search,
  type SearchNode,
  value,
} from '../learnedSearch.ts'
import { intInRange, numberInRange, optionsMatch } from '../options.ts'

export type BelisariusOptions = LearnedSearchOptions & {
  // Win-probability gap below the best plan within which any candidate may be played.
  slack: number
  // Exact adversarial activations verified below each root candidate before sampling.
  plies: number
}

const BELISARIUS_CHECKS = {
  slack: numberInRange(0, 0.5),
  plies: intInRange(0, 3),
}

// The pre-pass shares Sun Tzu's discipline: a bounded amount of exact work that degrades to the
// learned evaluator instead of running unbounded.
const PREPASS_BUDGET = 800
const REPLY_POOL = 48
const REPLY_BEAM = 6
// Candidates proven this far below the best adversarial value leave the sampling entirely.
const REFUTE_MARGIN = 0.3

export const BELISARIUS_LEVELS = {
  easy: {
    model: 'league-v1',
    simulations: 64,
    candidates: 12,
    exploration: 1.4,
    horizon: 12,
    backup: 'average',
    pressure: 0,
    slack: 0.3,
    plies: 1,
  },
  normal: {
    model: 'league-v1',
    simulations: 128,
    candidates: 16,
    exploration: 1.4,
    horizon: 16,
    backup: 'average',
    pressure: 0,
    slack: 0.15,
    plies: 2,
  },
  hard: {
    model: 'league-v1',
    simulations: 256,
    candidates: 20,
    exploration: 1.4,
    horizon: 20,
    backup: 'average',
    pressure: 0,
    slack: 0.07,
    plies: 2,
  },
  brutal: {
    model: 'league-v1',
    simulations: 512,
    candidates: 24,
    exploration: 1.4,
    horizon: 24,
    backup: 'average',
    pressure: 0,
    slack: 0,
    plies: 3,
  },
} as const satisfies Record<string, BelisariusOptions>

// The hybrid searcher: Sun Tzu's exact adversarial check on the near future, Hannibal's sampled
// search beyond it, and a difficulty dial that only widens how far below the best plan it plays.
export class BelisariusBot extends LearnedSearchBot {
  readonly name = 'belisarius'
  declare readonly options: Readonly<BelisariusOptions>

  constructor(options: Partial<BelisariusOptions> = {}) {
    super(BELISARIUS_LEVELS.normal, options)
    if (!optionsMatch(this.options, BELISARIUS_CHECKS))
      throw new RangeError('Invalid belisarius options')
  }

  // Alpha-beta over the shortlisted candidates: each is proven against the enemy's best replies
  // for `plies` activations, refuted plans leave the tree, and survivors keep their adversarial
  // value as the prior the simulations refine.
  protected expandRoot(root: SearchNode, search: Search): SearchNode[] {
    const children = super.expandRoot(root, search)
    if (this.options.plies <= 0 || children.length < 2) return children
    const funds = { left: PREPASS_BUDGET }
    const refined = children.map((child) => ({
      ...child,
      value: adversarial(child.state, this.options.plies, -1, 2, search, funds),
    }))
    const best = Math.max(...refined.map((child) => child.value))
    const kept = refined.filter(
      (child) => child.solved === 1 || child.value >= best - REFUTE_MARGIN,
    )
    const priors = kept.map((child) => Math.exp(child.value * 5))
    const sum = priors.reduce((total, prior) => total + prior, 0)
    root.children = kept.map((child, index) => ({ ...child, prior: priors[index] / sum }))
    root.complete = !!root.complete && kept.length === children.length
    return root.children
  }

  // Difficulty as a relative gap: within `slack` of the best plan, play the most damaging or
  // advancing candidate. Proven wins are always taken, proven losses never.
  protected select(children: SearchNode[], actor: Pawn, state: GameState): SearchNode {
    const utility = (child: SearchNode) =>
      child.solved ?? (child.visits ? child.total / child.visits : child.value)
    const ranked = children.toSorted(
      (a, b) =>
        (b.solved === 1 ? 1 : 0) - (a.solved === 1 ? 1 : 0) ||
        (a.solved === 0 ? 1 : 0) - (b.solved === 0 ? 1 : 0) ||
        utility(b) - utility(a),
    )
    const [best] = ranked
    if (best.solved === 1) return best
    const window = ranked.filter(
      (child) => child.solved !== 0 && utility(child) >= utility(best) - this.options.slack,
    )
    const target = state.pawns.find((p) => p.side !== actor.side && p.kind === 'king')!
    const enemyBlood = (s: GameState) =>
      s.pawns.filter((p) => p.side !== actor.side).reduce((sum, p) => sum + p.hp, 0)
    const before = enemyBlood(state)
    const appeal = (child: SearchNode) => {
      const pawn = child.state.pawns.find((p) => p.id === actor.id)
      const progress = pawn ? (hexDist(actor, target) - hexDist(pawn, target)) / 12 : 0
      return (before - enemyBlood(child.state)) / 6 + progress / 12
    }
    return (window.length ? window : [best]).toSorted((a, b) => appeal(b) - appeal(a))[0]
  }
}

// Alpha-beta over complete activations, leaves scored by the learned evaluator. Values always
// belong to the decision's root side, like the sampling above them.
function adversarial(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  search: Search,
  funds: { left: number },
): number {
  const ended = outcome(state, search.side)
  if (ended !== null) return ended
  if (depth <= 0 || funds.left-- <= 0) return value(state, search)
  const maximizing = activePawn(state)!.side === search.side
  const plans = replies(state, search, maximizing, funds)
  if (!plans.length) return value(state, search)
  let best = maximizing ? -Infinity : Infinity
  for (const plan of plans) {
    const result = adversarial(plan.state, depth - 1, alpha, beta, search, funds)
    if (maximizing) {
      best = Math.max(best, result)
      alpha = Math.max(alpha, best)
    } else {
      best = Math.min(best, result)
      beta = Math.min(beta, best)
    }
    if (alpha >= beta) break
  }
  return best
}

// Beam over the acting pawn's plans: the most damaging moves survive a first cut, then the
// learned evaluator ranks them and only the best few are proven exactly.
function replies(
  state: GameState,
  search: Search,
  maximizing: boolean,
  funds: { left: number },
): TurnPlan[] {
  let plans = introductionTurns(state, turnPlans(state))
  if (plans.length > REPLY_POOL) {
    const side = activePawn(state)!.side
    const foes = state.pawns.filter((p) => p.side !== side)
    const damage = (plan: TurnPlan) =>
      foes.reduce((sum, foe) => sum + foe.hp - hpOf(plan.state, foe.id), 0)
    plans = plans.toSorted((a, b) => damage(b) - damage(a)).slice(0, REPLY_POOL)
  }
  return plans
    .map((plan) => {
      funds.left--
      return { plan, worth: value(plan.state, search, false) }
    })
    .toSorted((a, b) => (maximizing ? b.worth - a.worth : a.worth - b.worth))
    .slice(0, REPLY_BEAM)
    .map((entry) => entry.plan)
}
