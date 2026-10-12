import { useEffect, useState } from 'react'
import { ACHIEVEMENTS, earnedAchievements, type AchievementId } from './lib/achievements'
import type { GameState, Side } from './lib/engine/index.ts'
import type { GameMode } from './lib/game-mode.ts'

const ACHIEVEMENTS_KEY = 'hexmate.achievements'

export function readUnlockedAchievements(): AchievementId[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) ?? '[]')
    return Array.isArray(stored)
      ? ACHIEVEMENTS.map(({ id }) => id).filter((id) => stored.includes(id))
      : []
  } catch {
    return []
  }
}

function unlockAchievements(earned: readonly AchievementId[]): void {
  if (!earned.length) return
  try {
    localStorage.setItem(
      ACHIEVEMENTS_KEY,
      JSON.stringify([...new Set([...readUnlockedAchievements(), ...earned])]),
    )
  } catch {
    // localStorage unavailable: achievements only show on this result screen
  }
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
