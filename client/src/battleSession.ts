import {
  battleIdentity,
  restoreState,
  sameBattle,
  snapshotState,
} from './lib/battleSnapshot.ts'
import type { BattleSetup, GameState } from './lib/engine/index.ts'
import type { BotDifficulty } from './lib/engine/ai.ts'
import type { GameMode } from './lib/game-mode.ts'

// A single slot for the current battle: every save overwrites the previous game.
const BATTLE_KEY = 'hexmate.battle'

export function readBattle(
  mode: GameMode,
  seed: string,
  difficulty: BotDifficulty,
  setup: BattleSetup | undefined,
): GameState | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(BATTLE_KEY) ?? 'null')
    if (typeof saved !== 'object' || saved === null) return null
    const { identity, state } = saved as { identity?: unknown; state?: unknown }
    if (!sameBattle(identity, battleIdentity(mode, seed, difficulty, setup))) return null
    return restoreState(state)
  } catch {
    return null
  }
}

export function saveBattle(
  mode: GameMode,
  seed: string,
  difficulty: BotDifficulty,
  setup: BattleSetup | undefined,
  state: GameState,
): void {
  try {
    localStorage.setItem(
      BATTLE_KEY,
      JSON.stringify({
        identity: battleIdentity(mode, seed, difficulty, setup),
        state: snapshotState(state),
      }),
    )
  } catch {
    // localStorage unavailable: the battle only lasts until the next reload
  }
}
