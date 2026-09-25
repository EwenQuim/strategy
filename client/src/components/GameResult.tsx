import { Link } from '@tanstack/react-router'
import type { Campaign } from '../lib/campaign'
import type { BattleSetup, Side } from '../lib/engine'
import * as m from '../i18n/game'
import { type GameMode, type PlayerNames } from '../lib/game-mode'
import type { BotDifficulty } from '../lib/engine/ai'
import { Icon } from './Icon'
import { buttonClassName } from './styles'

const resultButtonClassName =
  buttonClassName +
  ' mt-5 min-h-[46px] [@media(max-height:650px)]:mt-3 justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'

interface GameResultProps {
  winner: Side | 'draw'
  winnerLabel: string | null
  mode: GameMode
  difficulty: BotDifficulty
  setup?: BattleSetup
  names: PlayerNames
  campaign?: Campaign
  campaignLevel?: number
  progressSaved: boolean
  onRestart: () => void
}

export function GameResult({
  winner,
  winnerLabel,
  mode,
  difficulty,
  setup,
  names,
  campaign,
  campaignLevel,
  progressSaved,
  onRestart,
}: GameResultProps) {
  const local = mode === 'local'
  const isOnline = mode === 'online'

  return (
    <div
      className="absolute inset-0 grid place-items-center bg-[var(--result-scrim,#14281eab)] p-4 backdrop-blur-[5px]"
      data-testid="battle-result"
      role="status"
    >
      <div
        className="max-w-[390px] rounded-2xl border border-[#dcc48a59] bg-[var(--result-panel,#20362bee)] p-7 text-center shadow-[0_20px_60px_#07180f80] [&_h1]:mt-2 [&_h1]:mb-3 [&_h1]:font-serif [&_h1]:text-[32px] [&_h1]:leading-[normal] [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:text-[#bfccb4] [@media(max-height:650px)]:px-5 [@media(max-height:650px)]:py-4 [@media(max-height:650px)]:[&_h1]:text-[25px]"
        data-testid="result-card"
      >
        <div className="mx-auto mb-4 grid size-13 place-items-center rounded-full border border-[#dcc48a40] text-gold [&>svg]:size-[29px] [@media(max-height:650px)]:hidden">
          <Icon name="crown" />
        </div>
        <span className="text-muted text-[9px] font-semibold tracking-[0.17em] uppercase">
          {campaign && campaignLevel
            ? m.resultLevel(campaignLevel, campaign.levels[campaignLevel - 1].name)
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
                className="p-3 text-[11px] underline"
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
              difficulty,
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
