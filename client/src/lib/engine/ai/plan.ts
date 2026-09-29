import type { GameState } from '../engine.ts'
import type { Side } from '../pawns/index.ts'
import type { EnemyStance } from '../setup.ts'
import type { BotOptions } from '../ai.ts'

export type SidePlan = { caution: number; aggression: number }

const STANCE_AGGRESSION: Record<EnemyStance, number> = { hold: 0.5, balanced: 1, assault: 2 }
const HORDE_RATIO = 2
const PATIENT_ROUNDS = 2
const IMPATIENCE_PER_ROUND = 0.25

// A side the battle setup made at least twice as numerous accepts losses, and a side that has
// not fought for a while commits.
export function sidePlan(state: GameState, side: Side, options: BotOptions): SidePlan {
  const armies = state.setup ?? { player: [], enemy: [] }
  const forceRatio =
    armies[side].length / Math.max(1, armies[side === 'enemy' ? 'player' : 'enemy'].length)
  const stance = (side === 'enemy' && state.setup?.map && state.setup.enemyStance) || 'balanced'
  const idleRounds = Math.max(0, state.round - state.lastClashRound - PATIENT_ROUNDS)
  return {
    caution: (1 - options.riskAppetite) / (forceRatio >= HORDE_RATIO ? forceRatio : 1),
    aggression: STANCE_AGGRESSION[stance] * (1 + idleRounds * IMPATIENCE_PER_ROUND),
  }
}
