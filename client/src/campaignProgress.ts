import {
  CAMPAIGNS,
  campaignStorageKey,
  completeCampaignLevel,
  parseCampaignProgress,
  type Campaign,
} from './lib/campaign'

const sessionCompleted = new Map<string, number>()
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

export function readCampaignProgress(slug: string): number {
  const campaign = CAMPAIGNS.find((pack) => pack.slug === slug)
  if (!campaign) return 0
  try {
    sessionCompleted.set(
      slug,
      Math.max(
        sessionCompleted.get(slug) ?? 0,
        parseCampaignProgress(
          localStorage.getItem(campaignStorageKey(slug)),
          campaign.levels.length,
        ),
      ),
    )
  } catch {
    return sessionCompleted.get(slug) ?? 0
  }
  return sessionCompleted.get(slug)!
}

export function recordCampaignVictory(slug: string, level: number): void {
  const campaign: Campaign | undefined = CAMPAIGNS.find((pack) => pack.slug === slug)
  if (!campaign) return
  sessionCompleted.set(slug, completeCampaignLevel(campaign, readCampaignProgress(slug), level))
  try {
    localStorage.setItem(campaignStorageKey(slug), String(sessionCompleted.get(slug)))
    unsaved.delete(slug)
  } catch {
    unsaved.add(slug)
  }
  for (const listener of listeners) listener()
}
