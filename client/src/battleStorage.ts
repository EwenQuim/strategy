import { readLocal, saveLocal } from './storage.ts'
import {
  BATTLE_SNAPSHOT_VERSION,
  battleIdentity,
  restoreState,
  isSameBattle,
  snapshotState,
} from './lib/battleSnapshot.ts'
import type { BattleSetup, GameState } from './lib/engine/index.ts'
import type { BotConfig } from './bots/catalog.ts'
import type { GameMode } from './lib/game-mode.ts'
import type { SideBots } from './bots/participants.ts'

// A single slot for the current battle: every save overwrites the previous game.
const BATTLE_KEY = 'hexmate.battle'

export function readBattleFromLocalStorage(
  mode: GameMode,
  seed: string,
  bot: BotConfig,
  setup: BattleSetup | undefined,
  sideBots?: SideBots,
): GameState | null {
  return readLocal(BATTLE_KEY, null, (raw) => {
    const saved: unknown = JSON.parse(raw)
    if (typeof saved !== 'object' || saved === null) return null
    const { version, identity, state } = saved as Record<string, unknown>
    if (version !== BATTLE_SNAPSHOT_VERSION) return null
    if (!isSameBattle(identity, battleIdentity(mode, seed, sideBots ?? bot, setup))) return null
    return restoreState(state)
  })
}

export function saveBattleToLocalStorage(
  mode: GameMode,
  seed: string,
  bot: BotConfig,
  setup: BattleSetup | undefined,
  state: GameState,
  sideBots?: SideBots,
): void {
  saveLocal(
    BATTLE_KEY,
    JSON.stringify({
      version: BATTLE_SNAPSHOT_VERSION,
      identity: battleIdentity(mode, seed, sideBots ?? bot, setup),
      state: snapshotState(state),
    }),
  )
}
