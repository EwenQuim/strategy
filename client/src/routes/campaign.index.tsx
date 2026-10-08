import { MenuLayout } from '../components/MenuLayout'
import { createFileRoute, redirect } from '@tanstack/react-router'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import { CampaignCard } from '../components/CampaignCard'
import { totalVictories, visibleCampaigns } from '../lib/campaign'
import { readCampaignProgress } from '../campaignProgress'
import { readDeveloperPreview } from '../preferences'

export const Route = createFileRoute('/campaign/')({
  beforeLoad: () => {
    if (totalVictories(readCampaignProgress) === 0) throw redirect({ to: '/', replace: true })
  },
  component: function Campaigns() {
    return (
      <MenuLayout title={m.campaigns} wide>
        <ol
          className="m-0 grid list-none auto-rows-fr grid-cols-2 gap-3 p-0 min-[601px]:grid-cols-3 min-[900px]:gap-5"
          aria-label={m.campaigns}
        >
          {visibleCampaigns(readDeveloperPreview()).map((campaign) => (
            <li
              key={campaign.slug}
              className="h-[180px] min-[601px]:h-[220px] min-[900px]:h-[280px]"
            >
              <CampaignCard campaign={campaign} />
            </li>
          ))}
        </ol>
        <p className="text-center text-xs text-muted">{common.savedOnDevice}</p>
      </MenuLayout>
    )
  },
})
