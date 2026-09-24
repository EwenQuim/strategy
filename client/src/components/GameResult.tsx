import { Link } from '@tanstack/react-router'
import { CAMPAIGN_LEVELS } from '../lib/campaign'
import type { BattleSetup, Side } from '../lib/engine'
import { possessiveArmyLabels, type GameMode, type PlayerNames } from '../lib/game-mode'
import type { BotDifficulty } from '../lib/bot'
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
  campaignLevel,
  progressSaved,
  onRestart,
}: GameResultProps) {
  const local = mode === 'local'
  const isOnline = mode === 'online'
  const labels = possessiveArmyLabels(mode, names)

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
          {campaignLevel
            ? 'Level ' + campaignLevel + ': ' + CAMPAIGN_LEVELS[campaignLevel - 1].name
            : 'The battle is over'}
        </span>
        <h1>
          {winnerLabel ??
            (winner === 'player' ? 'The battlefield is yours.' : 'A crown has fallen.')}
        </h1>
        <p>
          {winner === 'draw'
            ? 'Both kings have fallen. Neither army wins.'
            : local || isOnline
              ? labels[winner === 'player' ? 'enemy' : 'player'] + ' king has fallen.'
              : winner === 'player'
                ? 'Their king has fallen. Your guard stands victorious.'
                : 'Your king has fallen. Regroup, rethink, and return.'}
        </p>
        {campaignLevel ? (
          <div className="flex flex-col items-center" data-testid="campaign-result-actions">
            {winner === 'player' ? (
              campaignLevel < CAMPAIGN_LEVELS.length ? (
                <Link
                  to="/campaign/$level"
                  params={{ level: String(campaignLevel + 1) }}
                  className={resultButtonClassName}
                  preload={false}
                >
                  Next level
                  <Icon name="arrow" />
                </Link>
              ) : (
                <Link to="/campaign" className={resultButtonClassName}>
                  Back to campaign
                </Link>
              )
            ) : (
              <button className={resultButtonClassName} onClick={onRestart}>
                Retry level
              </button>
            )}
            {!(winner === 'player' && campaignLevel === CAMPAIGN_LEVELS.length) && (
              <Link to="/campaign" className="p-3 text-[11px] underline">
                Level selection
              </Link>
            )}
            {!progressSaved && (
              <p role="status">Progress could not be saved. It will last only for this tab.</p>
            )}
          </div>
        ) : isOnline ? (
          <Link to="/online" className={resultButtonClassName} preload={false}>
            New online game
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
            New game
            <Icon name="arrow" />
          </Link>
        )}
      </div>
    </div>
  )
}
