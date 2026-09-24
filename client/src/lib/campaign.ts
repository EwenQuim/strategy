import levels from './campaign-levels.json' with { type: 'json' }
import { mapFromRows } from './engine/hex.ts'
import { validateSetup } from './engine/setup.ts'
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

levels.forEach((level, index) => {
  if (level.id !== index + 1 || !level.name || !level.seed)
    throw new Error('Campaign level ' + (index + 1) + ' is malformed')
  validateSetup(level.setup as FixedBattleSetup, mapFromRows(level.setup.map))
})

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
