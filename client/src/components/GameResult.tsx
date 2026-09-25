import { Link } from '@tanstack/react-router'
import type { Campaign } from '../lib/campaign'
import type { BattleSetup, Side } from '../lib/engine'
import * as m from '../i18n/game'
import { type GameMode, type PlayerNames } from '../lib/game-mode'
import type { BotDifficulty } from '../lib/engine/ai'
import { Icon } from './Icon'
import { panelClassName, primaryButtonClassName } from './styles'

const resultButtonClassName =
  primaryButtonClassName + ' mt-5 min-h-12 [@media(max-height:650px)]:mt-3'

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
      className="absolute inset-0 grid place-items-center bg-black/35 p-4 backdrop-blur-[5px]"
      data-testid="battle-result"
      role="status"
    >
      <div
        className={
          panelClassName +
          ' max-w-[390px] p-7 text-center [&_h1]:mt-2 [&_h1]:mb-3 [&_h1]:font-serif [&_h1]:text-[32px] [&_h1]:leading-tight [&_p]:text-[14px] [&_p]:leading-normal [&_p]:text-muted [@media(max-height:650px)]:px-5 [@media(max-height:650px)]:py-4 [@media(max-height:650px)]:[&_h1]:text-[25px]'
        }
        data-testid="result-card"
      >
        <div className="mx-auto mb-4 grid size-13 place-items-center rounded-full border border-gold/25 text-gold [&>svg]:size-[29px] [@media(max-height:650px)]:hidden">
          <Icon name="crown" />
        </div>
        <span className="text-[11px] font-semibold text-muted tracking-[0.17em] uppercase">
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
