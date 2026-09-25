import { Link } from '@tanstack/react-router'
import type { OnlineSession } from '../api/useGame'
import type { Campaign } from '../lib/campaign'
import { BIOMES, type Biome, type Pawn, type Side } from '../lib/engine'
import * as common from '../i18n/common'
import * as m from '../i18n/game'
import { possessiveArmyLabels, type GameMode, type PlayerNames } from '../lib/game-mode'
import { Icon, PawnIcon } from './Icon'
import { iconButtonClassName } from './styles'

interface GameHeaderProps {
  biome: Biome
  mode: GameMode
  names: PlayerNames
  online?: OnlineSession
  pawn?: Pawn
  winner: Side | 'draw' | null
  playing: boolean
  order: readonly number[]
  pawns: readonly Pawn[]
  active: number
  campaign?: Campaign
  campaignLevel?: number
  onHelp: () => void
}

export function GameHeader({
  biome,
  mode,
  names,
  online,
  pawn,
  winner,
  playing,
  order,
  pawns,
  active,
  campaign,
  campaignLevel,
  onHelp,
}: GameHeaderProps) {
  const local = mode === 'local'
  const isOnline = mode === 'online'
  const labels = possessiveArmyLabels(mode, names)
  const turnOrder = order.flatMap((id, index) => {
    const unit = pawns.find((p) => p.id === id)
    return unit ? [{ unit, index }] : []
  })

  return (
    <header
      className="relative z-2 bg-(--biome-panel) px-[max(16px,env(safe-area-inset-left))] pt-[max(8px,env(safe-area-inset-top))] shadow-[0_8px_30px_#0a1e1a22] min-[900px]:pt-[max(13px,env(safe-area-inset-top))] max-[601px]:px-4 max-[360px]:px-3 [@media(min-width:600px)_and_(max-height:480px)]:pt-[3px]"
      data-testid="game-header"
    >
      <div className="m-auto flex min-h-[50px] max-w-[1040px] items-center justify-between min-[900px]:min-h-[53px] [@media(max-height:650px)]:min-h-[43px] [@media(min-width:600px)_and_(max-height:480px)]:min-h-[42px]">
        <Link
          to={campaign ? '/campaign/$campaign' : isOnline ? '/online' : '/'}
          params={campaign ? { campaign: campaign.slug } : undefined}
          className="flex items-center gap-2.5 font-display text-[23px] leading-none tracking-[0.15em] min-[900px]:text-[26px]"
          aria-label={campaign ? common.campaignLevels : isOnline ? m.onlineLobby : m.home}
        >
          <span className="grid h-10 w-[34px] place-items-center rounded-[4px_4px_15px_15px] border border-[#dcc48a4a] bg-[linear-gradient(150deg,#dcc48a12,transparent)] text-gold [&>svg]:size-[22px]">
            <Icon name="crown" />
          </span>
          <span>
            HEX
            <span
              className="mt-[5px] block font-label text-[7px] leading-[normal] tracking-[0.29em] text-muted"
              data-testid="battle-subtitle"
            >
              {campaign && campaignLevel
                ? m.levelProgress(campaignLevel, campaign.levels.length)
                : BIOMES[biome].name}
            </span>
          </span>
        </Link>
        <div className="flex gap-0">
          {(local || isOnline) && pawn && !winner && (
            <span
              className="mr-2.5 self-center text-[10px] text-[#d69b81] data-[side=player]:text-[#b6d2b5]"
              data-testid="player-turn"
              data-side={pawn.side}
              role="status"
            >
              {isOnline && pawn.side === online?.side
                ? m.yourTurn
                : m.playerTurn(names[pawn.side])}
            </span>
          )}
          {mode === 'ai' && playing && pawn?.side === 'enemy' && (
            <span
              className="mr-2.5 self-center text-[10px] text-[#d69b81]"
              data-testid="enemy-turn"
              role="status"
            >
              {m.enemyTurn}
            </span>
          )}
          <button
            className={iconButtonClassName}
            onClick={onHelp}
            aria-label={m.howToPlay}
            title={m.howToPlay}
          >
            <Icon name="help" />
          </button>
        </div>
      </div>
      <div className="m-auto flex min-h-[46px] max-w-[1040px] items-center gap-3 border-t border-line min-[900px]:min-h-[48px] max-[601px]:gap-2 [@media(max-height:650px)]:min-h-[38px] [@media(min-width:600px)_and_(max-height:480px)]:hidden">
        <ol
          className="m-0 flex min-w-0 flex-1 list-none gap-[5px] overflow-x-auto p-0 [scrollbar-width:thin] max-[601px]:gap-[3px]"
          aria-label={m.turnOrder}
        >
          {turnOrder.map(({ unit, index }) => (
            <li
              key={unit.id}
              className="flex min-w-6 flex-1 items-center justify-center gap-1 rounded-[5px] border border-transparent px-[6px] py-1 text-[10px] text-[#b6d2b5] data-[side=enemy]:text-[#d69b81] data-[acted=true]:opacity-35 data-[side=player]:aria-[current=step]:border-[#b6d2b566] data-[side=player]:aria-[current=step]:bg-[#b6d2b514] data-[side=enemy]:aria-[current=step]:border-[#d69b8166] data-[side=enemy]:aria-[current=step]:bg-[#d69b8114] [&>svg]:size-4 min-[900px]:px-[9px] max-[601px]:flex-col max-[601px]:gap-0 max-[601px]:px-0.5 max-[601px]:py-[4px] max-[601px]:[&>svg]:size-3.5"
              data-testid="initiative-unit"
              data-side={unit.side}
              data-acted={index < active}
              aria-current={index === active && !winner ? 'step' : undefined}
              title={labels[unit.side] + ' ' + unit.kind + ' #' + unit.id}
            >
              <PawnIcon kind={unit.kind} />
              <span>{unit.id.toString().padStart(2, '0')}</span>
              <span className="sr-only">
                {labels[unit.side]} {unit.kind}
                {index < active ? ', already acted' : ''}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </header>
  )
}
