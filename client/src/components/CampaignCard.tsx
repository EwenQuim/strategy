import { useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from './Icon'
import { LevelMiniature } from './LevelMiniature'
import * as m from '../i18n/menus'
import { campaignName } from '../i18n/campaign'
import { isCampaignUnlocked, totalVictories, type Campaign } from '../lib/campaign'
import { BIOMES } from '../lib/engine'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const completed = useSyncExternalStore(subscribeCampaignProgress, () =>
    readCampaignProgress(campaign.slug),
  )
  const victories = useSyncExternalStore(subscribeCampaignProgress, () =>
    totalVictories(readCampaignProgress),
  )
  const total = campaign.levels.length
  const done = completed === total
  const showcase = campaign.levels[Math.min(completed, total - 1)].setup
  if (!isCampaignUnlocked(campaign, readCampaignProgress)) {
    const required = campaign.requiredVictories!
    return (
      <div
        className="relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-line bg-(--biome-background) p-3 text-muted"
        style={BIOMES[showcase.biome].theme}
        data-testid="campaign-pack"
        data-locked
        aria-label={m.lockedCampaignCard(campaignName(campaign), victories, required)}
      >
        <span className="flex min-h-0 flex-1 opacity-45 blur-[2px] grayscale-[40%]">
          <LevelMiniature setup={showcase} />
        </span>
        <span className="absolute inset-x-0 top-1/3 flex justify-center text-gold [&>svg]:size-10">
          <Icon name="lock" />
        </span>
        <span className="font-serif text-[24px] leading-none text-ink">
          {campaignName(campaign)}
        </span>
        <span className="text-[11px]">{m.victoriesToUnlock(victories, required)}</span>
      </div>
    )
  }
  return (
    <Link
      to="/campaign/$campaign"
      params={{ campaign: campaign.slug }}
      className="flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-line bg-(--biome-background) p-3 text-ink shadow-[0_6px_24px_#07180f30] hover:shadow-[0_8px_30px_#07180f50] hover:brightness-110 data-[done=true]:border-[#89bba477]"
      style={BIOMES[showcase.biome].theme}
      data-done={done}
      preload={false}
      data-testid="campaign-pack"
      aria-label={m.campaignCard(campaignName(campaign), completed, total)}
    >
      <LevelMiniature setup={showcase} />
      <span className="flex items-end justify-between gap-3">
        <span className="font-serif text-[24px] leading-none">{campaignName(campaign)}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted [&>svg]:size-4 [&>svg]:text-gold">
          {completed} / {total}
          <Icon name={done ? 'crown' : 'arrow'} className={done ? 'fill-current' : undefined} />
        </span>
      </span>
      <span className="h-1 overflow-hidden rounded-full bg-[#ffffff14]">
        <span
          className="block h-full rounded-full bg-gold"
          style={{ width: (completed / total) * 100 + '%' }}
        />
      </span>
    </Link>
  )
}
