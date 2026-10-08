import { useSyncExternalStore } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MenuBackground } from '../components/MenuBackground'
import { Icon } from '../components/Icon'
import { buttonClassName } from '../components/styles'
import { CAMPAIGNS, TUTORIAL, totalVictories } from '../lib/campaign'
import { useHealth } from '../api/online.ts'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import { campaignName } from '../i18n/campaign'

const homeControlClassName =
  buttonClassName +
  ' min-h-[clamp(56px,7.5dvh,68px)] shrink-0 justify-between gap-3 px-5 py-3 text-[16px] [@media(max-height:650px)]:min-h-12 [@media(max-height:650px)]:py-2 [@media(max-height:650px)]:text-sm'

const homeButtonClassName =
  homeControlClassName + ' border-line bg-[#ffffff04] text-ink hover:bg-[#ffffff0c]'

export const Route = createFileRoute('/')({
  component: function Landing() {
    const allCompleted = useSyncExternalStore(subscribeCampaignProgress, () =>
      totalVictories(readCampaignProgress),
    )
    const started = allCompleted > 0
    const allLevels = CAMPAIGNS.reduce((sum, campaign) => sum + campaign.levels.length, 0)
    const health = useHealth()
    const online = health.isSuccess
    return (
      <main className="relative isolate flex h-dvh flex-col overflow-hidden bg-[#101f1b] text-ink">
        <MenuBackground />
        <div
          data-testid="menu-content"
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain [@media(max-height:440px)]:justify-start px-[max(20px,env(safe-area-inset-left))] pr-[max(20px,env(safe-area-inset-right))] pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]"
        >
          <h1 className="shrink-0 font-display text-[clamp(48px,14vw,64px)] leading-[1.12] font-normal tracking-[-0.04em] [@media(max-height:650px)]:text-[40px]">
            Hexmate.
          </h1>
          <div
            className="mt-7 flex w-full max-w-[360px] shrink-0 flex-col gap-3 [@media(max-height:650px)]:mt-[18px] [@media(max-height:650px)]:gap-2"
            role="group"
            aria-label={m.chooseMode}
          >
            <Link
              to={started ? '/campaign' : '/campaign/$campaign/$level'}
              params={started ? undefined : { campaign: TUTORIAL.slug, level: '1' }}
              className={
                homeControlClassName +
                ' border-[#e5d19a] bg-[#d8c38a] text-[#24392a] hover:bg-[#ecdaa3]'
              }
              preload={false}
            >
              {started ? m.campaign : campaignName(TUTORIAL)}
              <span className="flex items-center gap-2 text-xs tabular-nums tracking-[0.04em] [&>svg]:size-4">
                {started && allCompleted + ' / ' + allLevels}
                <Icon name={started ? 'crown' : 'arrow'} />
              </span>
            </Link>
            <Link
              to="/game"
              search={{ mode: 'ai' }}
              className={homeButtonClassName}
              preload={false}
              title={m.quickPlayHint}
            >
              {common.quickPlay}
              <Icon name="arrow" />
            </Link>
            <Link to="/custom" className={homeButtonClassName} preload={false}>
              {common.customPlay}
              <Icon name="hex" />
            </Link>
            <Link
              to="/game"
              search={{ mode: 'local' }}
              className={homeButtonClassName}
              preload={false}
              title={m.twoPlayersHint}
            >
              {m.twoPlayers}
              <Icon name="arrow" />
            </Link>
            <Link
              to="/online"
              className={homeButtonClassName + ' data-[enabled=false]:opacity-35'}
              preload={false}
              data-enabled={online}
              aria-disabled={!online}
              tabIndex={online ? undefined : -1}
              onClick={(event) => {
                if (!online) event.preventDefault()
              }}
              title={online ? m.onlineHint : m.serverDown}
            >
              {m.online}
              <Icon name="arrow" />
            </Link>
          </div>
          <div className="mt-3 flex w-full max-w-[360px] shrink-0 gap-3">
            {(
              [
                ['/achievements', 'trophy', m.achievements],
                ['/settings', 'gear', m.settings],
              ] as const
            ).map(([to, icon, label]) => (
              <Link
                key={to}
                to={to}
                className={
                  buttonClassName +
                  ' min-h-14 flex-1 justify-center border-line bg-[#ffffff04] text-ink hover:bg-[#ffffff0c] [@media(max-height:650px)]:min-h-11'
                }
                preload={false}
                aria-label={label}
                title={label}
              >
                <Icon name={icon} />
              </Link>
            ))}
          </div>
        </div>
      </main>
    )
  },
})
