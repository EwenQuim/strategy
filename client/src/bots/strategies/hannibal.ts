import type { GameState } from '../../lib/engine/engine.ts'
import type { Pawn } from '../../lib/engine/pawns/index.ts'
import { hexDist } from '../../lib/engine/hex.ts'
import {
  LearnedSearchBot,
  type LearnedSearchOptions,
  type SearchNode,
} from '../learnedSearch.ts'

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
} as const satisfies Record<string, LearnedSearchOptions>

// The patient learned searcher: it trusts the search and only nudges its pawns forward once
// the battle has gone quiet.
export class HannibalBot extends LearnedSearchBot {
  readonly name = 'hannibal'

  constructor(
    options: Partial<LearnedSearchOptions> = {},
    candidateWeights?: readonly number[],
  ) {
    super(HANNIBAL_LEVELS.normal, options, candidateWeights)
  }

  // Final pick among searched candidates: proven outcomes first, then the most visited plan,
  // with a small advance bonus once the battle has gone quiet.
  protected select(children: SearchNode[], actor: Pawn, state: GameState): SearchNode {
    const target = state.pawns.find((p) => p.side !== actor.side && p.kind === 'king')!
    const idle = Math.max(0, state.round - state.lastClashRound - 2)
    const utility = (child: SearchNode) => {
      const mean = child.solved ?? (child.visits ? child.total / child.visits : child.value)
      const pawn = child.state.pawns.find((p) => p.id === actor.id)
      const progress = pawn ? (hexDist(actor, target) - hexDist(pawn, target)) / 12 : 0
      return mean + Math.min(0.15, idle * this.options.pressure) * progress
    }
    return children.toSorted(
      (a, b) =>
        (b.solved === 1 ? 1 : 0) - (a.solved === 1 ? 1 : 0) ||
        (a.solved === 0 ? 1 : 0) - (b.solved === 0 ? 1 : 0) ||
        (idle > 0
          ? utility(b) - utility(a)
          : this.options.backup === 'minimax'
            ? b.value - a.value || b.visits - a.visits
            : b.visits - a.visits || b.value - a.value),
    )[0]
  }
}
