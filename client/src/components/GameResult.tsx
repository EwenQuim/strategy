import { Link } from '@tanstack/react-router'
import type { Campaign } from '../lib/campaign'
import type { BattleSetup, Side } from '../lib/engine'
import * as m from '../i18n/game'
import { levelName } from '../i18n/campaign'
import { type GameMode, type PlayerNames, searchFromBot } from '../lib/game-mode'
import type { BotConfig } from '../lib/engine/ai/decision'
import { Icon } from './Icon'
import { primaryButtonClassName } from './styles'

const resultButtonClassName =
  primaryButtonClassName + ' mt-5 min-h-12 [@media(max-height:650px)]:mt-3'

interface GameResultProps {
  winner: Side | 'draw'
  viewerSide?: Side
  winnerLabel: string | null
  mode: GameMode
  bot: BotConfig
  setup?: BattleSetup
  names: PlayerNames
  campaign?: Campaign
  campaignLevel?: number
  progressSaved: boolean
  onRestart: () => void
}

export function GameResult({
  winner,
  viewerSide = 'player',
  winnerLabel,
  mode,
  bot,
  setup,
  names,
  campaign,
  campaignLevel,
  progressSaved,
  onRestart,
}: GameResultProps) {
  const local = mode === 'local'
  const isOnline = mode === 'online'
  const outcome =
    local || winner === viewerSide ? 'victory' : winner === 'draw' ? 'draw' : 'defeat'

  return (
    <div
      className="battle-result-enter group/result absolute inset-0 isolate grid place-items-center overflow-hidden bg-black/55 p-4 backdrop-blur-[3px] motion-reduce:animate-none"
      data-testid="battle-result"
      data-outcome={outcome}
      role="status"
    >
      {outcome !== 'draw' && (
        <div
          data-testid="battle-result-effect"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-1 overflow-hidden motion-reduce:hidden"
        >
          <div className="battle-result-glow absolute inset-0 m-auto size-[min(720px,170vmin)] rounded-full bg-[radial-gradient(closest-side,#d0675add,#bd635866_55%,transparent)] group-data-[outcome=victory]/result:bg-[radial-gradient(closest-side,#f6d789cc,#f6d78933_55%,transparent)]" />
          {outcome === 'victory' && (
            <svg
              viewBox="-160 -160 320 320"
              className="battle-result-sparks absolute inset-0 m-auto size-[min(640px,160vmin)] fill-gold stroke-gold"
            >
              {Array.from({ length: 12 }, (_, index) => (
                <g key={index} transform={'rotate(' + index * 30 + ')'}>
                  <path d="M0-110l3 7-3 7-3-7Z" />
                  <path d="M0-120v-12" strokeWidth="2" strokeLinecap="round" />
                </g>
              ))}
            </svg>
          )}
        </div>
      )}
      <div
        className={
          (outcome === 'victory'
            ? 'battle-result-victory '
            : outcome === 'defeat'
              ? 'battle-result-defeat '
              : '') +
          'w-full max-w-[300px] rounded-2xl border border-gold/45 bg-[var(--biome-panel,#20362b)] bg-[image:linear-gradient(#ffffff14,transparent_45%)] px-6 py-6 text-center text-ink shadow-[0_0_0_1px_#0008,0_25px_90px_#000c] motion-reduce:animate-none [&_h1]:mt-1.5 [&_h1]:mb-2 [&_h1]:font-serif [&_h1]:text-[26px] [&_h1]:leading-tight [&_p]:text-[14px] [&_p]:leading-normal [&_p]:text-muted [@media(max-height:650px)]:px-5 [@media(max-height:650px)]:py-4 [@media(max-height:650px)]:[&_h1]:text-[22px]'
        }
        data-testid="result-card"
      >
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full border border-gold/25 text-gold group-data-[outcome=defeat]/result:rotate-[-18deg] group-data-[outcome=defeat]/result:text-[#d59d81] [&>svg]:size-[24px] [@media(max-height:650px)]:hidden">
          <Icon name="crown" />
        </div>
        <span className="text-xs font-semibold text-muted tracking-[0.17em] uppercase">
          {campaign && campaignLevel
            ? m.resultLevel(campaignLevel, levelName(campaign.levels[campaignLevel - 1]))
            : m.battleOver}
        </span>
        <h1>{winnerLabel ?? (winner === 'player' ? m.battlefieldYours : m.crownFallen)}</h1>
        <p>
          {winner === 'draw'
            ? m.bothKingsFallen
            : local || isOnline
              ? m.kingFallen(names[winner === 'player' ? 'enemy' : 'player'])
              : winner === 'player'
                ? m.enemyKingFallen
                : m.yourKingFallen}
        </p>
        {campaign && campaignLevel ? (
          <div className="flex flex-col items-center" data-testid="campaign-result-actions">
            {winner === 'player' ? (
              campaignLevel < campaign.levels.length ? (
                <Link
                  to="/campaign/$campaign/$level"
                  params={{ campaign: campaign.slug, level: String(campaignLevel + 1) }}
                  className={resultButtonClassName}
                  preload={false}
                >
                  {m.nextLevel}
                  <Icon name="arrow" />
                </Link>
              ) : (
                <Link
                  to="/campaign/$campaign"
                  params={{ campaign: campaign.slug }}
                  className={resultButtonClassName}
                >
                  {m.backToCampaign}
                </Link>
              )
            ) : (
              <button className={resultButtonClassName} onClick={onRestart}>
                {m.retryLevel}
              </button>
            )}
            {!(winner === 'player' && campaignLevel === campaign.levels.length) && (
              <Link
                to="/campaign/$campaign"
                params={{ campaign: campaign.slug }}
                className="p-3 text-[13px] underline"
              >
                {m.levelSelection}
              </Link>
            )}
            {!progressSaved && <p role="status">{m.progressNotSaved}</p>}
          </div>
        ) : isOnline ? (
          <Link to="/online" className={resultButtonClassName} preload={false}>
            {m.newOnlineGame}
            <Icon name="arrow" />
          </Link>
        ) : (
          <Link
            to="/game"
            search={{
              mode,
              ...searchFromBot(bot),
              setup: setup?.map === undefined ? setup : undefined,
            }}
            className={resultButtonClassName}
            preload={false}
          >
            {m.newGame}
            <Icon name="arrow" />
          </Link>
        )}
      </div>
    </div>
  )
}
