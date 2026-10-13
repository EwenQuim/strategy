import { useEffect, useState } from 'react'
import { readLocal, saveLocal } from './storage.ts'
import { ACHIEVEMENTS, earnedAchievements, type AchievementId } from './lib/achievements'
import type { GameState, Side } from './lib/engine/index.ts'
import type { GameMode } from './lib/game-mode.ts'

const ACHIEVEMENTS_KEY = 'hexmate.achievements'

export function readUnlockedAchievements(): AchievementId[] {
  return readLocal(ACHIEVEMENTS_KEY, [], (raw) => {
    const stored: unknown = JSON.parse(raw)
    return Array.isArray(stored)
      ? ACHIEVEMENTS.map(({ id }) => id).filter((id) => stored.includes(id))
      : []
  })
}

function unlockAchievements(earned: readonly AchievementId[]): void {
  if (!earned.length) return
  saveLocal(
    ACHIEVEMENTS_KEY,
    JSON.stringify([...new Set([...readUnlockedAchievements(), ...earned])]),
  )
}

// Achievements first earned in this battle, compared with those unlocked when it was opened.
export function useFreshAchievements(
  state: GameState,
  mode: GameMode,
  viewerSide: Side = 'player',
  enabled = true,
): AchievementId[] {
  const [known] = useState(readUnlockedAchievements)
  const earned = earnedAchievements(state, viewerSide)
  // Two players sharing a device could farm achievements, so local games never earn any.
  useEffect(() => {
    if (mode !== 'local' && enabled) unlockAchievements(earned)
  }, [earned, enabled, mode])
  return mode === 'local' || !enabled ? [] : earned.filter((id) => !known.includes(id))
}
