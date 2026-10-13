import { readLocal, saveLocal } from './storage.ts'
import {
  CAMPAIGNS,
  campaignStorageKey,
  completeCampaignLevel,
  parseCampaignProgress,
} from './campaign'

const NONE: readonly number[] = []
const sessionCleared = new Map<string, readonly number[]>()
const unsaved = new Set<string>()
const listeners = new Set<() => void>()

export function subscribeCampaignProgress(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function campaignProgressSaved(slug: string): boolean {
  return !unsaved.has(slug)
}

export function readClearedLevels(slug: string): readonly number[] {
  const campaign = CAMPAIGNS.find((pack) => pack.slug === slug)
  if (!campaign) return NONE
  const known = sessionCleared.get(slug) ?? NONE
  const stored = readLocal(campaignStorageKey(slug), NONE, (raw) =>
    parseCampaignProgress(raw, campaign.levels.length),
  )
  const merged = [...new Set([...known, ...stored])].sort((a, b) => a - b)
  // Keep the same array while nothing changed so useSyncExternalStore snapshots stay stable.
  if (merged.length === known.length) return known
  sessionCleared.set(slug, merged)
  return merged
}

export function readCampaignProgress(slug: string): number {
  return readClearedLevels(slug).length
}

export function recordCampaignVictory(slug: string, level: number): void {
  const campaign = CAMPAIGNS.find((pack) => pack.slug === slug)
  if (!campaign) return
  const cleared = completeCampaignLevel(campaign, readClearedLevels(slug), level)
  sessionCleared.set(slug, cleared)
  if (saveLocal(campaignStorageKey(slug), JSON.stringify(cleared))) unsaved.delete(slug)
  else unsaved.add(slug)
  for (const listener of listeners) listener()
}
