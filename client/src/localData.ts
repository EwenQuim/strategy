import { API_KEY_STORAGE as MISTRAL_KEY_STORAGE } from './api/mistralBot.ts'
import { API_KEY_STORAGE as JEV_KEY_STORAGE } from './api/jevBot.ts'

// Wipes every local save (campaign progress, achievements, battle snapshots,
// preferences) while keeping the BYOK API keys pasted in Settings.
export function clearLocalData(): void {
  try {
    const apiKeys = [MISTRAL_KEY_STORAGE, JEV_KEY_STORAGE].map(
      (key) => [key, localStorage.getItem(key)] as const,
    )
    localStorage.clear()
    for (const [key, value] of apiKeys) if (value !== null) localStorage.setItem(key, value)
  } catch {
    // localStorage unavailable: there is nothing to delete
  }
}
