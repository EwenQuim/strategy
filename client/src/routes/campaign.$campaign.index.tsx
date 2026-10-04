import { MenuLayout } from '../components/MenuLayout'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import { campaignName, levelName } from '../i18n/campaign'
import { Icon } from '../components/Icon'
import { LevelMiniature } from '../components/LevelMiniature'
import {
  CAMPAIGNS,
  isCampaignUnlocked,
  visibleCampaigns,
  isLevelUnlocked,
} from '../lib/campaign'
import { BIOMES } from '../lib/engine'
import {
  readCampaignProgress,
  readClearedLevels,
  subscribeCampaignProgress,
} from '../campaignProgress'
import { readDeveloperPreview } from '../preferences'

const levelCardClassName =
  'relative flex h-full min-h-11 flex-col gap-1 overflow-hidden rounded-xl border border-line bg-(--biome-background) p-1.5 text-center text-[11px] leading-snug text-ink wrap-anywhere shadow-[0_6px_16px_#0002] data-[status=completed]:border-[#89bba4] data-[status=ready]:border-gold/60 disabled:text-muted disabled:opacity-100 [&:disabled>svg]:opacity-35 [&:not(:disabled):hover]:brightness-115'

export const Route = createFileRoute('/campaign/$campaign/')({
  beforeLoad: ({ params }) => {
    const campaign = visibleCampaigns(readDeveloperPreview()).find(
      (pack) => pack.slug === params.campaign,
    )
    if (!campaign) throw redirect({ to: '/', replace: true })
    if (!isCampaignUnlocked(campaign, readCampaignProgress))
      throw redirect({ to: '/campaign', replace: true })
  },
  component: function CampaignLevels() {
    const { campaign: slug } = Route.useParams()
    const campaign = CAMPAIGNS.find((pack) => pack.slug === slug)!
    const clearedLevels = useSyncExternalStore(subscribeCampaignProgress, () =>
      readClearedLevels(campaign.slug),
    )
    const completed = clearedLevels.length
    return (
      <MenuLayout
        title={campaignName(campaign)}
        section="campaign"
        scroll={false}
        backTo={
          readCampaignProgress('original') === CAMPAIGNS[0].levels.length ? '/campaign' : '/'
        }
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-1 text-[11px] text-muted"
          data-testid="campaign-progress"
          role="status"
        >
          <span>{m.levelsCompleted(completed, campaign.levels.length)}</span>
          {completed === campaign.levels.length && <span>{common.campaignComplete}</span>}
        </div>
        <ol
          className={
            'm-0 grid min-h-0 flex-1 list-none auto-rows-fr gap-2 p-0 ' +
            (campaign.levels.length > 10 ? 'grid-cols-4' : 'grid-cols-2')
          }
          aria-label={common.campaignLevels}
        >
          {campaign.levels.map((level) => {
            const unlocked = isLevelUnlocked(campaign, level.id, clearedLevels)
            const cleared = clearedLevels.includes(level.id)
            const status = m.levelStatus[cleared ? 'completed' : unlocked ? 'ready' : 'locked']
            const content = (
              <>
                <LevelMiniature setup={level.setup} />
                <span className="flex shrink-0 items-center justify-between gap-1">
                  <strong className="text-base leading-none font-bold text-gold">
                    {level.id.toString().padStart(2, '0')}
                  </strong>
                  <Icon
                    name={cleared ? 'check' : unlocked ? 'arrow' : 'lock'}
                    className={'size-3 shrink-0 ' + (cleared ? 'text-[#89bba4]' : 'text-muted')}
                  />
                </span>
                <span className="hidden shrink-0 text-[11px] font-semibold min-[601px]:block [@media(max-height:650px)]:hidden">
                  {levelName(level)}
                </span>
              </>
            )
            return (
              <li key={level.id} className="min-h-0">
                {unlocked ? (
                  <Link
                    to="/campaign/$campaign/$level"
                    params={{ campaign: campaign.slug, level: String(level.id) }}
                    className={levelCardClassName}
                    data-testid="campaign-level"
                    style={BIOMES[level.setup.biome].theme}
                    data-status={cleared ? 'completed' : 'ready'}
                    aria-label={m.levelCard(level.id, levelName(level), status)}
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
                    aria-label={m.levelCard(level.id, levelName(level), m.levelStatus.locked)}
                  >
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        <p className="shrink-0 text-center text-[10px] text-muted">{common.savedOnDevice}</p>
      </MenuLayout>
    )
  },
})
