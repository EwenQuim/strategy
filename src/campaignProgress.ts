import {
  CAMPAIGN_STORAGE_KEY,
  completeCampaignLevel,
  parseCampaignProgress,
} from './lib/campaign'

let sessionCompleted = 0
let saved = true
const listeners = new Set<() => void>()

export function subscribeCampaignProgress(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export const campaignProgressSaved = () => saved

export function readCampaignProgress(): number {
  try {
    sessionCompleted = Math.max(
      sessionCompleted,
      parseCampaignProgress(localStorage.getItem(CAMPAIGN_STORAGE_KEY)),
    )
  } catch {
    return sessionCompleted
  }
  return sessionCompleted
}

export function recordCampaignVictory(level: number): void {
  sessionCompleted = completeCampaignLevel(readCampaignProgress(), level)
  try {
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, String(sessionCompleted))
    saved = true
  } catch {
    saved = false
  }
  for (const listener of listeners) listener()
}
