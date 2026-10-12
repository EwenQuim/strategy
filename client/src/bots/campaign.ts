import { BOT_LEVELS } from '../lib/engine/ai.ts'
import type { Campaign, CampaignLevel } from '../lib/campaign.ts'
import type { BotConfig } from './catalog.ts'

export function campaignBot(campaign: Campaign, level: CampaignLevel): BotConfig {
  return {
    name: 'depthsearch',
    options: {
      ...BOT_LEVELS[level.difficulty],
      ...(campaign.depth !== undefined ? { depth: campaign.depth } : {}),
    },
  }
}
