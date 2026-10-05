import { useSyncExternalStore } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MenuBackground } from '../components/MenuBackground'
import { Icon } from '../components/Icon'
import { buttonClassName } from '../components/styles'
import { CAMPAIGNS, totalVictories } from '../lib/campaign'
import { useHealth } from '../api/online.ts'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'

const homeButtonClassName =
  buttonClassName +
  ' min-h-13 justify-between gap-3 border-line bg-[#ffffff04] px-[18px] text-ink hover:bg-[#ffffff0c] [@media(max-height:650px)]:min-h-12'

export const Route = createFileRoute('/')({
  component: function Landing() {
    const original = CAMPAIGNS[0]
    const completed = useSyncExternalStore(subscribeCampaignProgress, () =>
      readCampaignProgress(original.slug),
    )
    const done = completed === original.levels.length
    const allCompleted = useSyncExternalStore(subscribeCampaignProgress, () =>
      totalVictories(readCampaignProgress),
    )
    const allLevels = CAMPAIGNS.reduce((sum, campaign) => sum + campaign.levels.length, 0)
    const health = useHealth()
    const online = health.isSuccess
    return (
      <main className="relative isolate flex h-dvh flex-col overflow-hidden bg-[#101f1b] text-ink">
        <MenuBackground />
        <div
          data-testid="menu-content"
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-[max(20px,env(safe-area-inset-left))] pr-[max(20px,env(safe-area-inset-right))] pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]"
        >
          <h1 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.12] font-normal tracking-[-0.04em] [@media(max-height:650px)]:text-[32px]">
            Hexmate.
          </h1>
          <div
            className="mt-[27px] flex w-full max-w-[300px] flex-col gap-3 [@media(max-height:650px)]:mt-[18px] [@media(max-height:650px)]:gap-2"
            role="group"
            aria-label={m.chooseMode}
          >
            <Link
              to={done ? '/campaign' : '/campaign/$campaign'}
              params={done ? undefined : { campaign: original.slug }}
              className={
                buttonClassName +
                ' min-h-13 justify-between gap-3 border-[#e5d19a] bg-[#d8c38a] px-[18px] text-[#24392a] hover:bg-[#ecdaa3] [@media(max-height:650px)]:min-h-12'
              }
              preload={false}
            >
              {done ? m.campaigns : m.campaign}
              <span className="flex items-center gap-2 text-[10px] tracking-[0.08em] [&>svg]:size-4">
                {done
                  ? allCompleted + ' / ' + allLevels
                  : completed + ' / ' + original.levels.length}
                <Icon name="crown" className={done ? 'fill-current' : undefined} />
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
          <div className="mt-3 flex w-full max-w-[300px] gap-3">
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
                  ' min-h-13 flex-1 justify-center border-line bg-[#ffffff04] text-ink hover:bg-[#ffffff0c] [@media(max-height:650px)]:min-h-11'
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
