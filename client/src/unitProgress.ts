import { useSyncExternalStore } from 'react'
import { CAMPAIGNS, STARTER_RECRUITS } from './campaign.ts'
import { readClearedLevels, subscribeCampaignProgress } from './campaignProgress.ts'
import type { PawnKind } from './lib/engine/index.ts'

let unlockedUnits: readonly PawnKind[] = ['king', ...STARTER_RECRUITS]

export function readUnlockedUnits(): readonly PawnKind[] {
  const unlocked = new Set<PawnKind>(['king', ...STARTER_RECRUITS])
  for (const campaign of CAMPAIGNS) {
    for (const level of readClearedLevels(campaign.slug)) {
      for (const kind of campaign.levels[level - 1].unlocks) unlocked.add(kind)
    }
  }
  const next = [...unlocked]
  if (next.length !== unlockedUnits.length || next.some((kind, i) => kind !== unlockedUnits[i]))
    unlockedUnits = next
  return unlockedUnits
}

export function useUnlockedUnits(): readonly PawnKind[] {
  return useSyncExternalStore(subscribeCampaignProgress, readUnlockedUnits)
}

export function randomUnlockedRoster(random: { next: () => number }): PawnKind[] {
  const recruits = readUnlockedUnits().filter((kind) => kind !== 'king')
  for (let i = recruits.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1))
    ;[recruits[i], recruits[j]] = [recruits[j], recruits[i]]
  }
  return recruits.slice(0, 5)
}
