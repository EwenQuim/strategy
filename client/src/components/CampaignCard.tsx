import { useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from './Icon'
import { LevelMiniature } from './LevelMiniature'
import { LockedCampaignCard } from './LockedCampaignCard'
import * as m from '../i18n/menus'
import { campaignName } from '../i18n/campaign'
import { isCampaignUnlocked, type Campaign } from '../lib/campaign'
import { BIOMES } from '../lib/engine'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const completed = useSyncExternalStore(subscribeCampaignProgress, () =>
    readCampaignProgress(campaign.slug),
  )
  const unlocked = useSyncExternalStore(subscribeCampaignProgress, () =>
    isCampaignUnlocked(campaign, readCampaignProgress),
  )
  const total = campaign.levels.length
  const done = completed === total
  const showcase = campaign.levels[Math.min(completed, total - 1)].setup
  if (!unlocked) return <LockedCampaignCard campaign={campaign} />
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
      <span className="font-serif text-[clamp(18px,5.2vw,24px)] leading-[1.05] text-balance">
        {campaignName(campaign)}
      </span>
      <span className="flex items-center gap-2 text-[11px] whitespace-nowrap text-muted [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-gold">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#ffffff14]">
          <span
            className="block h-full rounded-full bg-gold"
            style={{ width: (completed / total) * 100 + '%' }}
          />
        </span>
        {completed} / {total}
        <Icon name={done ? 'crown' : 'arrow'} className={done ? 'fill-current' : undefined} />
      </span>
    </Link>
  )
}
