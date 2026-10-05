import { useSyncExternalStore } from 'react'
import { Icon } from './Icon'
import { LevelMiniature } from './LevelMiniature'
import * as m from '../i18n/menus'
import { campaignName } from '../i18n/campaign'
import { totalVictories, type Campaign } from '../lib/campaign'
import { BIOMES } from '../lib/engine'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'

export function LockedCampaignCard({ campaign }: { campaign: Campaign }) {
  const victories = useSyncExternalStore(subscribeCampaignProgress, () =>
    totalVictories(readCampaignProgress),
  )
  const required = campaign.requiredVictories ?? 0
  const teaser = campaign.levels[0].setup
  return (
    <div
      className="relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-line bg-(--biome-background) p-3 text-muted"
      style={BIOMES[teaser.biome].theme}
      data-testid="campaign-pack"
      data-locked
      aria-label={
        campaign.achievementGated
          ? m.lockedAchievementCampaignCard(campaignName(campaign))
          : m.lockedCampaignCard(campaignName(campaign), victories, required)
      }
    >
      <span className="flex min-h-0 flex-1 opacity-45 blur-[2px] grayscale-[40%]">
        <LevelMiniature setup={teaser} />
      </span>
      <span className="absolute inset-x-0 top-1/3 flex justify-center text-gold [&>svg]:size-10">
        <Icon name="lock" />
      </span>
      <span className="font-serif text-[clamp(18px,5.2vw,24px)] leading-[1.05] text-balance text-ink">
        {campaignName(campaign)}
      </span>
      <span className="text-[11px]">
        {campaign.achievementGated
          ? m.achievementsToUnlock
          : m.victoriesToUnlock(victories, required)}
      </span>
    </div>
  )
}
