import { iconButtonClassName } from '../components/styles'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Icon } from '../components/Icon'
import { CampaignCard } from '../components/CampaignCard'
import { CAMPAIGNS } from '../lib/campaign'
import { readCampaignProgress } from '../campaignProgress'

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
      <main className="m-auto flex h-dvh max-w-[800px] flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))]">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-[32px] leading-[normal]">Campaigns</h1>
          </div>
          <Link to="/" className={iconButtonClassName} aria-label="Back to home">
            <Icon name="close" />
          </Link>
        </header>
        <ol
          className="m-0 grid min-h-0 flex-1 list-none auto-rows-fr grid-cols-1 gap-3 p-0 min-[601px]:grid-cols-2 min-[601px]:content-center min-[601px]:auto-rows-[minmax(0,340px)]"
          aria-label="Campaigns"
        >
          {CAMPAIGNS.map((campaign) => (
            <li key={campaign.slug}>
              <CampaignCard campaign={campaign} />
            </li>
          ))}
        </ol>
        <p className="text-center text-[10px] text-muted">Wins are saved on this device.</p>
      </main>
    )
  },
})
