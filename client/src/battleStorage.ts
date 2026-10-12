import {
  BATTLE_SNAPSHOT_VERSION,
  battleIdentity,
  restoreState,
  isSameBattle,
  snapshotState,
} from './lib/battleSnapshot.ts'
import type { BattleSetup, GameState } from './lib/engine/index.ts'
import { parseBotConfig, type BotConfig } from './bots/catalog.ts'
import type { GameMode } from './lib/game-mode.ts'

// A single slot for the current battle: every save overwrites the previous game.
const BATTLE_KEY = 'hexmate.battle'

export function readBattleFromLocalStorage(
  mode: GameMode,
  seed: string,
  bot: BotConfig,
  setup: BattleSetup | undefined,
): GameState | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(BATTLE_KEY) ?? 'null')
    if (typeof saved !== 'object' || saved === null) return null
    const { version, identity, state } = saved as Record<string, unknown>
    if (version !== BATTLE_SNAPSHOT_VERSION) return null
    if (typeof identity !== 'object' || identity === null) return null
    const storedIdentity = identity as Record<string, unknown>
    if (typeof storedIdentity.bot !== 'string') return null
    // Migrate older { name, difficulty } identities and normalize option key order, so an
    // update or a differently ordered shared URL still resumes the same offline battle.
    const normalized = {
      ...storedIdentity,
      bot: JSON.stringify(parseBotConfig(JSON.parse(storedIdentity.bot))),
    }
    if (!isSameBattle(normalized, battleIdentity(mode, seed, parseBotConfig(bot), setup)))
      return null
    return restoreState(state)
  } catch {
    return null
  }
}

export function saveBattleToLocalStorage(
  mode: GameMode,
  seed: string,
  bot: BotConfig,
  setup: BattleSetup | undefined,
  state: GameState,
): void {
  try {
    localStorage.setItem(
      BATTLE_KEY,
      JSON.stringify({
        version: BATTLE_SNAPSHOT_VERSION,
        identity: battleIdentity(mode, seed, bot, setup),
        state: snapshotState(state),
      }),
    )
  } catch {
    // localStorage unavailable: the battle only lasts until the next reload
  }
}
