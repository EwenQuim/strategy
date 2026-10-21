import { useSyncExternalStore } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ButtonLink } from '../components/Button'
import { MenuBackground } from '../components/MenuBackground'
import { HomeBoard } from '../components/HomeBoard'
import { Icon } from '../components/Icon'
import { CAMPAIGNS, TUTORIAL, totalVictories } from '../campaign'
import { useHealth } from '../api/online.ts'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import { campaignName } from '../i18n/campaign'
import { settings } from '../i18n/settings'

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
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain px-[max(20px,env(safe-area-inset-left))] pr-[max(20px,env(safe-area-inset-right))] pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] [@media(max-height:440px)]:justify-start"
        >
          <div className="grid w-full max-w-[400px] shrink-0 items-center gap-y-7 min-[900px]:max-w-[960px] min-[900px]:grid-cols-[1.2fr_1fr] min-[900px]:gap-x-20 [@media(max-height:650px)]:gap-y-4 [@media(min-width:600px)_and_(max-height:440px)]:max-w-[960px] [@media(min-width:600px)_and_(max-height:440px)]:grid-cols-[1.2fr_1fr] [@media(min-width:600px)_and_(max-height:440px)]:gap-x-12">
            <div className="flex min-w-0 flex-col items-center gap-5 text-center min-[900px]:gap-8 [@media(max-height:650px)]:gap-3">
              <h1
                aria-label="Bellirion"
                className="font-brand text-[clamp(34px,12vw,60px)] leading-none font-semibold tracking-[0.015em] uppercase min-[900px]:text-[64px] [@media(max-height:650px)]:text-[38px]"
              >
                <span aria-hidden="true" className="inline-flex items-baseline">
                  Belliri
                  <Icon
                    name="hex"
                    className="mx-[-0.04em] size-[0.85em] translate-y-[0.07em] text-gold"
                  />
                  n
                </span>
              </h1>
              <HomeBoard />
            </div>
            <div className="mx-auto w-full min-w-0 max-w-[360px]">
              <div
                className="flex flex-col gap-4 [@media(max-height:650px)]:gap-3"
                role="group"
                aria-label={m.chooseMode}
              >
                <ButtonLink
                  to={started ? '/campaign' : '/campaign/$campaign/$level'}
                  params={started ? undefined : { campaign: TUTORIAL.slug, level: '1' }}
                  variant="primary"
                  size="menu"
                  className="w-full"
                  preload={false}
                >
                  <Icon name="crown" className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    {started ? m.campaign : campaignName(TUTORIAL)}
                  </span>
                  {started && (
                    <span className="text-xs tabular-nums">
                      {allCompleted + ' / ' + allLevels}
                    </span>
                  )}
                  <Icon name="arrow" className="size-4 shrink-0" />
                </ButtonLink>
                <ButtonLink
                  to="/game"
                  search={{ mode: 'ai' }}
                  size="menu"
                  className="w-full"
                  preload={false}
                  title={m.quickPlayHint}
                >
                  <Icon name="energy" className="size-5 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1">{common.quickPlay}</span>
                  <Icon name="arrow" className="size-4 shrink-0 text-muted" />
                </ButtonLink>
                <ButtonLink to="/custom" size="menu" className="w-full" preload={false}>
                  <Icon name="hex" className="size-5 shrink-0 text-[#b0c9a0]" />
                  <span className="min-w-0 flex-1">{common.customPlay}</span>
                  <Icon name="arrow" className="size-4 shrink-0 text-muted" />
                </ButtonLink>
                <ButtonLink
                  to="/online"
                  variant="accent"
                  size="menu"
                  className="w-full"
                  preload={false}
                  aria-disabled={!online}
                  aria-label={m.online}
                  title={online ? m.onlineHint : m.serverDown}
                >
                  <span
                    aria-hidden="true"
                    className="w-5 shrink-0 text-[11px] font-bold tracking-wider"
                  >
                    VS
                  </span>
                  <span className="min-w-0 flex-1">{m.online}</span>
                  <span
                    aria-hidden="true"
                    className={
                      online
                        ? 'size-2 shrink-0 rounded-full bg-[#365a32]'
                        : 'size-2 shrink-0 rounded-full bg-ink/40'
                    }
                  />
                  <Icon name="arrow" className="size-4 shrink-0" />
                </ButtonLink>
              </div>
              <div className="mt-5 flex border-t border-line pt-2 [@media(max-height:650px)]:mt-3">
                {(
                  [
                    ['/achievements', 'trophy', m.achievements],
                    ['/settings', 'gear', settings],
                  ] as const
                ).map(([to, icon, label]) => (
                  <ButtonLink
                    key={to}
                    to={to}
                    variant="ghost"
                    size="compact"
                    className="min-w-0 flex-1"
                    preload={false}
                    aria-label={label}
                    title={label}
                  >
                    <Icon name={icon} className="size-4 shrink-0" />
                    {label}
                  </ButtonLink>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  },
})
