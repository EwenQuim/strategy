import { useSyncExternalStore } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MenuLayout } from '../components/MenuLayout'
import { Icon } from '../components/Icon'
import { LevelMiniature } from '../components/LevelMiniature'
import { menuCardClassName, menuPrimaryButtonClassName } from '../components/styles'
import { CAMPAIGNS, totalVictories } from '../lib/campaign'
import { BIOMES } from '../lib/engine'
import { useHealth } from '../api/online.ts'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import * as n from '../i18n/navigation'

const multiplayerCardClassName =
  menuCardClassName +
  ' flex min-h-[72px] flex-col items-start justify-between gap-2 p-3 text-[13px] font-semibold hover:border-gold/30 hover:bg-white/5'

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
    const showcase = original.levels[Math.min(completed, original.levels.length - 1)].setup
    const health = useHealth()
    const online = health.isSuccess
    return (
      <MenuLayout title="Hexmate" backTo={null} scroll={false}>
        <div
          className="grid min-h-0 w-full max-w-[440px] flex-1 grid-cols-2 grid-rows-[minmax(104px,1fr)_52px_80px_44px] gap-2 self-center"
          role="group"
          aria-label={m.chooseMode}
        >
          <Link
            to={done ? '/campaign' : '/campaign/$campaign'}
            params={done ? undefined : { campaign: original.slug }}
            className="group relative col-span-2 flex min-h-0 items-end justify-between gap-3 overflow-hidden rounded-2xl border border-gold/30 bg-[radial-gradient(ellipse_at_top_right,#a3b87a40,transparent_70%),linear-gradient(135deg,#2d4938,#192e28)] p-3 shadow-[0_8px_24px_#0003] hover:border-gold/60"
            preload={false}
            aria-label={m.campaign}
          >
            <span className="relative z-1 flex min-w-0 flex-col gap-2">
              <span className="flex items-center gap-2 text-gold">
                <Icon name="crown" className="size-4" />
                <span className="text-lg font-bold tracking-tight">{m.campaign}</span>
              </span>
              <span className="text-xs text-muted">
                {m.levelsCompleted(
                  done ? allCompleted : completed,
                  done ? allLevels : original.levels.length,
                )}
              </span>
              <span
                className="h-1.5 w-28 overflow-hidden rounded-full bg-black/20"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-gold"
                  style={{
                    width:
                      (done ? allCompleted / allLevels : completed / original.levels.length) *
                        100 +
                      '%',
                  }}
                />
              </span>
            </span>
            <span
              className="pointer-events-none absolute inset-x-4 top-3 bottom-[76px] flex opacity-80"
              style={BIOMES[showcase.biome].theme}
            >
              <LevelMiniature setup={showcase} />
            </span>
            <Icon name="arrow" className="absolute right-4 bottom-3 size-4 text-gold" />
          </Link>
          <Link
            to="/game"
            search={{ mode: 'ai' }}
            className={menuPrimaryButtonClassName + ' col-span-2 justify-between px-4'}
            preload={false}
            title={m.quickPlayHint}
            aria-label={common.quickPlay}
          >
            <span className="flex items-center gap-3">
              <Icon name="sword" className="size-5" />
              {common.quickPlay}
            </span>
            <Icon name="arrow" />
          </Link>
          <Link
            to="/game"
            search={{ mode: 'local' }}
            className={multiplayerCardClassName}
            preload={false}
            title={m.twoPlayersHint}
          >
            <Icon name="users" className="size-5 text-gold" />
            {m.twoPlayers}
          </Link>
          <Link
            to="/online"
            className={multiplayerCardClassName + ' data-[enabled=false]:opacity-55'}
            preload={false}
            data-enabled={online}
            aria-disabled={!online}
            aria-label={m.online}
            tabIndex={online ? undefined : -1}
            onClick={(event) => {
              if (!online) event.preventDefault()
            }}
            title={online ? m.onlineHint : m.serverDown}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <Icon name="globe" className="size-5 shrink-0 text-gold" />
              {!online && (
                <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-muted">
                  {n.offline}
                </span>
              )}
            </span>
            {m.online}
          </Link>
          <Link
            to="/custom"
            className={
              menuCardClassName +
              ' col-span-2 flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm font-semibold hover:border-gold/30 hover:bg-white/5'
            }
            preload={false}
          >
            <span className="flex items-center gap-3">
              <Icon name="sliders" className="size-5 text-gold" />
              {common.customPlay}
            </span>
            <Icon name="arrow" className="size-4 text-muted" />
          </Link>
        </div>
      </MenuLayout>
    )
  },
})
