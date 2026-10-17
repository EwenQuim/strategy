import type { Campaign, CampaignLevel } from '../campaign.ts'
import type { BotConfig } from './catalog.ts'

export function campaignBot(_campaign: Campaign, level: CampaignLevel): BotConfig {
  return level.bot
}
