import { useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from './Icon'
import { buttonClassName } from './styles'
import type { Campaign } from '../lib/campaign'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'

const campaignCardClassName =
  buttonClassName +
  ' min-h-13 items-center justify-between gap-3 border-line bg-[#ffffff04] px-[18px] text-ink hover:bg-[#ffffff0c]'

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const completed = useSyncExternalStore(subscribeCampaignProgress, () =>
    readCampaignProgress(campaign.slug),
  )
  const difficulty = campaign.levels[0].difficulty
  return (
    <Link
      to="/campaign/$campaign"
      params={{ campaign: campaign.slug }}
      className={campaignCardClassName}
      preload={false}
      data-testid="campaign-pack"
      aria-label={
        campaign.name +
        ' campaign, ' +
        completed +
        ' / ' +
        campaign.levels.length +
        ' completed'
      }
    >
      <span className="flex flex-col items-start leading-[1.3]">
        <span className="font-serif">{campaign.name}</span>
        <span className="text-[10px] text-muted">
          {completed} / {campaign.levels.length} completed
        </span>
        {difficulty !== 'normal' && (
          <span className="text-[9px] font-semibold tracking-[0.17em] text-gold uppercase">
            {difficulty} AI
          </span>
        )}
      </span>
      <Icon name="arrow" />
    </Link>
  )
}
