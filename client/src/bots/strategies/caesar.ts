import type { GameState } from '../../lib/engine/engine.ts'
import type { Pawn } from '../../lib/engine/pawns/index.ts'
import { hexDist } from '../../lib/engine/hex.ts'
import {
  LearnedSearchBot,
  type LearnedSearchOptions,
  type SearchNode,
} from '../learnedSearch.ts'

export const CAESAR_LEVELS = {
  easy: {
    model: 'league-v2',
    simulations: 32,
    candidates: 8,
    exploration: 1.4,
    horizon: 12,
    backup: 'average',
    pressure: 0.2,
  },
  normal: {
    model: 'league-v2',
    simulations: 128,
    candidates: 16,
    exploration: 1.4,
    horizon: 16,
    backup: 'average',
    pressure: 0.2,
  },
  hard: {
    model: 'league-v2',
    simulations: 512,
    candidates: 20,
    exploration: 1.4,
    horizon: 24,
    backup: 'average',
    pressure: 0.2,
  },
  brutal: {
    model: 'league-v2',
    simulations: 2048,
    candidates: 32,
    exploration: 1.4,
    horizon: 32,
    backup: 'average',
    pressure: 0.25,
  },
} as const satisfies Record<string, LearnedSearchOptions>

// The hungry learned searcher: every activation, plans that advance on the enemy king or
// shed enemy blood win the ties a patient search would leave to shuffling in place.
export class CaesarBot extends LearnedSearchBot {
  readonly name = 'caesar'

  constructor(options: Partial<LearnedSearchOptions> = {}) {
    super(CAESAR_LEVELS.normal, options)
  }

  protected select(children: SearchNode[], actor: Pawn, state: GameState): SearchNode {
    const target = state.pawns.find((p) => p.side !== actor.side && p.kind === 'king')!
    const enemyBlood = (s: GameState) =>
      s.pawns.filter((p) => p.side !== actor.side).reduce((sum, p) => sum + p.hp, 0)
    const before = enemyBlood(state)
    const utility = (child: SearchNode) => {
      const mean = child.solved ?? (child.visits ? child.total / child.visits : child.value)
      const pawn = child.state.pawns.find((p) => p.id === actor.id)
      const progress = pawn ? (hexDist(actor, target) - hexDist(pawn, target)) / 12 : 0
      const blood = Math.max(0, before - enemyBlood(child.state)) / 6
      return mean + this.options.pressure * (progress + blood)
    }
    return children.toSorted(
      (a, b) =>
        (b.solved === 1 ? 1 : 0) - (a.solved === 1 ? 1 : 0) ||
        (a.solved === 0 ? 1 : 0) - (b.solved === 0 ? 1 : 0) ||
        utility(b) - utility(a),
    )[0]
  }
}
