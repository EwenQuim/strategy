import levels from './campaign-levels.json' with { type: 'json' }
import type { FixedBattleSetup } from './engine/index.ts'

export interface CampaignLevel {
  id: number
  name: string
  seed: string
  setup: FixedBattleSetup
  intro: {
    readonly roleplay: string
    readonly newElements: readonly { name: string; description: string }[]
  }
}

export const CAMPAIGN_LEVELS = levels as CampaignLevel[]

export const CAMPAIGN_STORAGE_KEY = 'hexmate:campaign:v1'

export function parseCampaignProgress(value: string | null): number {
  const completed = Number(value)
  return value !== null &&
    /^\d+$/.test(value) &&
    Number.isInteger(completed) &&
    completed >= 0 &&
    completed <= CAMPAIGN_LEVELS.length
    ? completed
    : 0
}

export function isLevelUnlocked(level: number, completed: number): boolean {
  return (
    Number.isInteger(level) &&
    level >= 1 &&
    level <= CAMPAIGN_LEVELS.length &&
    level <= completed + 1
  )
}

export function completeCampaignLevel(completed: number, level: number): number {
  return isLevelUnlocked(level, completed) ? Math.max(completed, level) : completed
}
