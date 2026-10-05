import { MenuLayout } from '../components/MenuLayout'
import { createFileRoute, redirect } from '@tanstack/react-router'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import { CampaignCard } from '../components/CampaignCard'
import { CAMPAIGNS, visibleCampaigns } from '../lib/campaign'
import { readCampaignProgress } from '../campaignProgress'
import { readDeveloperPreview } from '../preferences'

export const Route = createFileRoute('/campaign/')({
  beforeLoad: () => {
    if (readCampaignProgress('original') < CAMPAIGNS[0].levels.length)
      throw redirect({
        to: '/campaign/$campaign',
        params: { campaign: 'original' },
        replace: true,
      })
  },
  component: function Campaigns() {
    return (
      <MenuLayout title={m.campaigns}>
        <ol
          className="m-0 grid list-none auto-rows-fr grid-cols-2 gap-3 p-0 min-[601px]:grid-cols-3"
          aria-label={m.campaigns}
        >
          {visibleCampaigns(readDeveloperPreview()).map((campaign) => (
            <li key={campaign.slug} className="h-[164px] min-[601px]:h-[190px]">
              <CampaignCard campaign={campaign} />
            </li>
          ))}
        </ol>
        <p className="text-center text-[10px] text-muted">{common.savedOnDevice}</p>
      </MenuLayout>
    )
  },
})
