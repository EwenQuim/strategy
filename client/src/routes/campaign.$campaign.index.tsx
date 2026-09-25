import { iconButtonClassName } from '../components/styles'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { Icon } from '../components/Icon'
import { LevelMiniature } from '../components/LevelMiniature'
import { CAMPAIGNS, isLevelUnlocked } from '../lib/campaign'
import { BIOMES } from '../lib/engine'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'

const levelCardClassName =
  'flex size-full flex-col gap-1 overflow-hidden rounded-lg border border-line bg-(--biome-background) p-1.5 text-center text-[clamp(9px,2.5vw,12px)] leading-[1.15] text-ink wrap-anywhere data-[status=completed]:border-[#89bba477] data-[status=ready]:border-gold disabled:text-muted [&:disabled>svg]:opacity-55 [&:not(:disabled):hover]:brightness-115'

export const Route = createFileRoute('/campaign/$campaign/')({
  beforeLoad: ({ params }) => {
    if (!CAMPAIGNS.some((campaign) => campaign.slug === params.campaign))
      throw redirect({ to: '/', replace: true })
  },
  component: function CampaignLevels() {
    const { campaign: slug } = Route.useParams()
    const campaign = CAMPAIGNS.find((pack) => pack.slug === slug)!
    const completed = useSyncExternalStore(subscribeCampaignProgress, () =>
      readCampaignProgress(campaign.slug),
    )
    return (
      <main className="m-auto flex h-dvh max-w-[800px] flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))]">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-[32px] leading-[normal]">{campaign.name}</h1>
          </div>
          <Link to="/" className={iconButtonClassName} aria-label="Back to home">
            <Icon name="close" />
          </Link>
        </header>
        <div
          className="flex items-center justify-between gap-3 text-[10px] text-muted"
          data-testid="campaign-progress"
          role="status"
        >
          <span>
            {completed} / {campaign.levels.length} completed
          </span>
          {completed === campaign.levels.length && <span>Campaign complete!</span>}
        </div>
        <ol
          className="m-0 grid min-h-0 flex-1 list-none grid-cols-4 grid-rows-5 gap-2 p-0"
          aria-label="Campaign levels"
        >
          {campaign.levels.map((level) => {
            const unlocked = isLevelUnlocked(campaign, level.id, completed)
            const cleared = level.id <= completed
            const status = cleared ? 'Completed' : unlocked ? 'Ready' : 'Locked'
            const content = (
              <>
                <LevelMiniature setup={level.setup} />
                <span>
                  <strong className="font-serif font-normal text-gold">
                    {level.id.toString().padStart(2, '0')}
                  </strong>{' '}
                  {level.name}
                </span>
                <small className="text-[8px] text-muted">{status}</small>
              </>
            )
            return (
              <li key={level.id}>
                {unlocked ? (
                  <Link
                    to="/campaign/$campaign/$level"
                    params={{ campaign: campaign.slug, level: String(level.id) }}
                    className={levelCardClassName}
                    data-testid="campaign-level"
                    style={BIOMES[level.setup.biome].theme}
                    data-status={cleared ? 'completed' : 'ready'}
                    aria-label={'Level ' + level.id + ': ' + level.name + ', ' + status}
                    preload={false}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    className={levelCardClassName}
                    data-testid="campaign-level"
                    style={BIOMES[level.setup.biome].theme}
                    disabled
                    aria-label={'Level ' + level.id + ': ' + level.name + ', Locked'}
                  >
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        <p className="text-center text-[10px] text-muted">Wins are saved on this device.</p>
      </main>
    )
  },
})
