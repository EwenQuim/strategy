import { useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from './Icon'
import { LevelMiniature } from './LevelMiniature'
import { LockedCampaignCard } from './LockedCampaignCard'
import * as m from '../i18n/menus'
import { campaignName } from '../i18n/campaign'
import { isCampaignUnlocked, TUTORIAL, type Campaign } from '../lib/campaign'
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
      to={campaign === TUTORIAL ? '/campaign/$campaign/$level' : '/campaign/$campaign'}
      params={{ campaign: campaign.slug, level: '1' }}
      className="flex h-full flex-col gap-2 overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_at_top,#ffffff18,transparent_70%)] bg-(--biome-background) p-3 min-[900px]:gap-3 min-[900px]:p-5 text-ink shadow-[0_8px_28px_#0003] hover:border-gold/40 hover:brightness-110 data-[done=true]:border-[#89bba477]"
      style={BIOMES[showcase.biome].theme}
      data-done={done}
      preload={false}
      data-testid="campaign-pack"
      aria-label={m.campaignCard(campaignName(campaign), completed, total)}
    >
      <LevelMiniature setup={showcase} />
      <span className="text-lg min-[900px]:text-2xl leading-tight font-bold tracking-tight text-balance wrap-anywhere max-[360px]:text-base">
        {campaignName(campaign)}
      </span>
      <span className="flex items-center gap-2 text-xs min-[900px]:text-sm whitespace-nowrap text-muted [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-gold">
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
