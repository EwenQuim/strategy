import { battleSetupTag, parseBattleRecord } from './lib/battleRecord.ts'
import type { Action, BattleSetup } from './lib/engine/index.ts'
import type { BotDifficulty } from './lib/engine/ai.ts'
import type { GameMode } from './lib/game-mode.ts'

const KEY_PREFIX = 'hexmate.battle.'

export function battleRecordKey(
  mode: GameMode,
  seed: string,
  difficulty: BotDifficulty,
): string {
  return KEY_PREFIX + mode + '.' + seed + '.' + difficulty
}

export function readBattleActions(
  key: string,
  setup: BattleSetup | undefined,
): Action[] | null {
  try {
    return parseBattleRecord(sessionStorage.getItem(key), battleSetupTag(setup))
  } catch {
    return null
  }
}

export function saveBattleActions(
  key: string,
  setup: BattleSetup | undefined,
  actions: readonly Action[],
): void {
  try {
    // sessionStorage is per tab, so only one battle is ever live: drop stale records.
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const stored = sessionStorage.key(i)
      if (stored?.startsWith(KEY_PREFIX) && stored !== key) sessionStorage.removeItem(stored)
    }
    sessionStorage.setItem(key, JSON.stringify({ setup: battleSetupTag(setup), actions }))
  } catch {
    // sessionStorage unavailable: the battle only lasts until the next reload
  }
}

export function clearBattleActions(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // sessionStorage unavailable: nothing was saved
  }
}
