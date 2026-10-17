import type { Pawn, Side } from '../lib/engine'
import * as m from '../i18n/game'
import { unitNames } from '../i18n/units'
import { PawnIcon } from './Icon'

interface GameCommandSummaryProps {
  pawn?: Pawn
  winner: Side | 'draw' | null
  winnerLabel: string | null
}

export function GameCommandSummary({ pawn, winner, winnerLabel }: GameCommandSummaryProps) {
  const label = winner
    ? (winnerLabel ?? (winner === 'player' ? m.victory : m.defeat))
    : pawn
      ? unitNames[pawn.kind]
      : m.yourGuard

  return (
    <div className="mb-3.5 flex items-center justify-between gap-[15px] min-[900px]:mb-[17px] max-[601px]:mb-3 max-[601px]:gap-2.5 [@media(max-height:650px)]:mb-2 [@media(min-width:600px)_and_(max-height:480px)]:m-0 [@media(min-width:600px)_and_(max-height:480px)]:flex-col [@media(min-width:600px)_and_(max-height:480px)]:items-start [@media(min-width:600px)_and_(max-height:480px)]:gap-1.5 [@media(min-width:600px)_and_(max-height:480px)]:w-48 [@media(min-width:600px)_and_(max-height:480px)]:shrink-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-[46px] w-[42px] shrink-0 place-items-center rounded-[10px_10px_16px_16px] border border-[#c4d1a53b] bg-[linear-gradient(135deg,#4c604038,#203d3077)] text-gold [&>svg]:size-[26px] min-[900px]:h-[49px] min-[900px]:w-[47px] max-[601px]:hidden [@media(min-width:600px)_and_(max-height:480px)]:hidden">
          <PawnIcon kind={pawn?.kind ?? 'swordsman'} />
        </div>
        <div>
          <h2 className="font-display text-[20px] leading-[normal] capitalize whitespace-nowrap min-[900px]:text-[24px] max-[601px]:text-[19px] max-[360px]:text-[16px] [@media(min-width:600px)_and_(max-height:480px)]:text-[16px]">
            {label}
            {!winner && pawn && (
              <span className="font-label text-[10px] leading-[normal] tracking-[0.05em] text-[#7f957e] max-[601px]:text-[9px] max-[360px]:hidden">
                {' '}
                / {pawn.id.toString().padStart(2, '0')}
              </span>
            )}
          </h2>
        </div>
      </div>
    </div>
  )
}
