import { useMemo, useState } from 'react'
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

// Called from useGame's dispatch funnel so this module's hook stays render-pure.
export function unlockAchievements(earned: readonly AchievementId[]): void {
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
): AchievementId[] {
  const [known] = useState(readUnlockedAchievements)
  // Two players sharing a device could farm achievements, so local games never earn any.
  const earned = useMemo(
    () => (mode === 'local' ? [] : earnedAchievements(state, viewerSide)),
    [mode, state, viewerSide],
  )
  return earned.filter((id) => !known.includes(id))
}
