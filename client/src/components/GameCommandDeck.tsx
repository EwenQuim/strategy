import type { Action, Pawn, Side } from '../lib/engine'
import { canUseSpecial } from '../lib/engine'
import * as m from '../i18n/game'
import { Icon, PawnIcon } from './Icon'

const actionButtonClassName =
  'grid min-h-16 grid-cols-[auto_1fr] items-center gap-x-2.5 rounded-[9px] border px-4 py-3 text-left [&:enabled:hover]:border-[#bcc8a670] [&:enabled:hover]:bg-[#ffffff0c] max-[601px]:min-h-[76px] max-[601px]:grid-cols-1 max-[601px]:justify-items-center max-[601px]:gap-y-[3px] max-[601px]:rounded-lg max-[601px]:px-0.5 max-[601px]:pt-[9px] max-[601px]:pb-2 max-[601px]:text-center [@media(max-height:650px)]:min-h-[65px] [@media(max-height:650px)]:py-1.5 [@media(min-width:600px)_and_(max-height:480px)]:min-h-12 [@media(min-width:600px)_and_(max-height:480px)]:px-3 [@media(min-width:600px)_and_(max-height:480px)]:py-1.5'

interface GameCommandDeckProps {
  pawn?: Pawn
  winner: Side | 'draw' | null
  winnerLabel: string | null
  myTurn: boolean
  attacking: boolean
  usingSpecial: boolean
  hasFoes: boolean
  hasSpecialTargets: boolean
  phase: 'move' | 'attack' | 'special' | 'charge' | 'over'
  targetCount: number
  dispatch: (action: Action) => void
}

export function GameCommandDeck({
  pawn,
  winner,
  winnerLabel,
  myTurn,
  attacking,
  usingSpecial,
  hasFoes,
  hasSpecialTargets,
  phase,
  targetCount,
  dispatch,
}: GameCommandDeckProps) {
  return (
    <footer
      className="relative z-2 border-t border-[#c4d1a530] bg-(--biome-panel) pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_#10201840]"
      data-testid="command-deck"
    >
      <div className="m-auto max-w-[920px] px-[18px] pt-3.5 pb-2.5 min-[900px]:pt-[17px] min-[900px]:pb-3 max-[601px]:px-3.5 max-[601px]:pt-3 max-[601px]:pb-[9px] max-[360px]:px-2.5 [@media(max-height:650px)]:pt-2 [@media(max-height:650px)]:pb-1.5 [@media(min-width:600px)_and_(max-height:480px)]:flex [@media(min-width:600px)_and_(max-height:480px)]:items-center [@media(min-width:600px)_and_(max-height:480px)]:gap-5 [@media(min-width:600px)_and_(max-height:480px)]:px-[18px] [@media(min-width:600px)_and_(max-height:480px)]:py-2">
        <div className="mb-3.5 flex items-center justify-between gap-[15px] min-[900px]:mb-[17px] max-[601px]:mb-3 max-[601px]:gap-2.5 [@media(max-height:650px)]:mb-2 [@media(min-width:600px)_and_(max-height:480px)]:m-0 [@media(min-width:600px)_and_(max-height:480px)]:flex-col [@media(min-width:600px)_and_(max-height:480px)]:items-start [@media(min-width:600px)_and_(max-height:480px)]:gap-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-[46px] w-[42px] shrink-0 place-items-center rounded-[10px_10px_16px_16px] border border-[#c4d1a53b] bg-[linear-gradient(135deg,#4c604038,#203d3077)] text-gold [&>svg]:size-[26px] min-[900px]:h-[49px] min-[900px]:w-[47px] max-[601px]:hidden [@media(min-width:600px)_and_(max-height:480px)]:hidden">
              <PawnIcon kind={pawn?.kind ?? 'swordsman'} />
            </div>
            <div>
              <h2 className="font-display text-[20px] leading-[normal] capitalize whitespace-nowrap min-[900px]:text-[24px] max-[601px]:text-[19px] max-[360px]:text-[16px] [@media(min-width:600px)_and_(max-height:480px)]:text-[16px]">
                {winner
                  ? (winnerLabel ?? (winner === 'player' ? m.victory : m.defeat))
                  : (pawn?.kind ?? m.yourGuard)}
                {!winner && pawn && (
                  <span className="font-label text-[10px] leading-[normal] tracking-[0.05em] text-[#7f957e] max-[601px]:text-[9px] max-[360px]:hidden">
                    {' '}
                    / {pawn.id.toString().padStart(2, '0')}
                  </span>
                )}
              </h2>
            </div>
          </div>
          {pawn && !winner && <UnitStats pawn={pawn} />}
        </div>
        <div className="grid grid-cols-3 gap-2 min-[900px]:gap-3 max-[601px]:gap-1.5 [@media(min-width:600px)_and_(max-height:480px)]:flex-1">
          <AttackButton
            pawn={pawn}
            myTurn={myTurn}
            attacking={attacking}
            usingSpecial={usingSpecial}
            hasFoes={hasFoes}
            dispatch={dispatch}
          />
          <SpecialButton
            pawn={pawn}
            myTurn={myTurn}
            attacking={attacking}
            usingSpecial={usingSpecial}
            hasSpecialTargets={hasSpecialTargets}
            targetCount={targetCount}
            phase={phase}
            dispatch={dispatch}
          />
          <EndTurnButton pawn={pawn} myTurn={myTurn} dispatch={dispatch} />
        </div>
      </div>
    </footer>
  )
}

function StatMeter({
  name,
  note,
  value,
  max,
  filledClass,
}: {
  name: string
  note?: string
  value: number
  max: number
  filledClass: string
}) {
  return (
    <div className="w-[60px] min-w-[60px] min-[900px]:w-[83px] min-[900px]:min-w-[83px] max-[601px]:w-[49px] max-[601px]:min-w-[49px] [@media(min-width:600px)_and_(max-height:480px)]:w-[45px] [@media(min-width:600px)_and_(max-height:480px)]:min-w-[45px]">
      <span className="flex justify-between gap-2.5 text-[9px] text-muted max-[601px]:gap-[5px]">
        {name}
        {note ? ' ' + note : ''}{' '}
        <b className="text-[9px] font-medium text-[#d9dfc9]">
          {value}/{max}
        </b>
      </span>
      <div
        className="mt-[7px] flex w-full gap-[3px]"
        role="meter"
        aria-label={name}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {Array.from({ length: max }, (_, i) => (
          <i
            key={i}
            data-filled={i < value}
            className={
              'h-[5px] min-w-0 flex-1 rounded-[1px] bg-[#34483a] max-[601px]:h-1 ' + filledClass
            }
          />
        ))}
      </div>
    </div>
  )
}

function UnitStats({ pawn }: { pawn: Pawn }) {
  return (
    <div
      className="flex items-center gap-[18px] min-[900px]:gap-7 max-[601px]:gap-2.5 max-[360px]:gap-2 [@media(min-width:600px)_and_(max-height:480px)]:gap-2.5"
      data-testid="unit-stats"
    >
      <StatMeter
        name={m.health}
        value={pawn.hp}
        max={pawn.maxHp}
        filledClass="data-[filled=true]:bg-[#b7c9a0]"
      />
      <StatMeter
        name={m.energy}
        note={pawn.bonusEnergy ? '+' + pawn.bonusEnergy : undefined}
        value={pawn.energy}
        max={pawn.maxEnergy}
        filledClass="data-[filled=true]:bg-[#d4bb7b]"
      />
      <div className="w-[60px] min-w-[43px] min-[900px]:w-[83px] min-[900px]:min-w-[83px] max-[601px]:w-[49px] max-[601px]:min-w-[41px] [@media(min-width:600px)_and_(max-height:480px)]:w-[45px] [@media(min-width:600px)_and_(max-height:480px)]:min-w-[45px] border-l border-line pl-3.5 [&_svg]:size-[15px] [&_small]:-ml-[3px] [&_small]:text-[10px] max-[601px]:pl-2 max-[601px]:[&_svg]:hidden [@media(min-width:600px)_and_(max-height:480px)]:pl-2">
        <span className="flex justify-between gap-2.5 text-[9px] text-muted max-[601px]:gap-[5px]">
          {m.escape}
        </span>
        <strong className="mt-0.5 flex items-center gap-1 text-[18px] leading-none font-medium text-[#bad0bb] max-[601px]:text-[17px]">
          <Icon name="escape" />
          {pawn.escapeChance}
          <small>%</small>
        </strong>
      </div>
    </div>
  )
}

function AttackButton({
  pawn,
  myTurn,
  attacking,
  usingSpecial,
  hasFoes,
  dispatch,
}: {
  pawn?: Pawn
  myTurn: boolean
  attacking: boolean
  usingSpecial: boolean
  hasFoes: boolean
  dispatch: (action: Action) => void
}) {
  return (
    <button
      className={
        actionButtonClassName +
        ' border-[#d69e803d] bg-[#b8795809] text-[#e3b096] aria-pressed:border-[#e0a586] aria-pressed:bg-[#ab695333]'
      }
      data-action="attack"
      disabled={!myTurn || usingSpecial || !pawn?.energy || (!attacking && !hasFoes)}
      onClick={() =>
        dispatch(attacking ? { type: 'cancelTargeting' } : { type: 'act', action: 'attack' })
      }
      aria-pressed={attacking}
    >
      <Icon
        className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
        name={attacking ? 'close' : 'sword'}
      />
      <span className="text-[13px] font-semibold whitespace-nowrap max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px]">
        {attacking ? m.cancel : m.attack}
      </span>
      <small className="mt-0.5 block text-[9px] max-[601px]:mt-0 text-[#b5a997]">
        {attacking ? m.chooseEnemy : m.energyCost(1)}
      </small>
    </button>
  )
}

function SpecialButton({
  pawn,
  myTurn,
  attacking,
  usingSpecial,
  hasSpecialTargets,
  targetCount,
  phase,
  dispatch,
}: {
  pawn?: Pawn
  myTurn: boolean
  attacking: boolean
  usingSpecial: boolean
  hasSpecialTargets: boolean
  targetCount: number
  phase: 'move' | 'attack' | 'special' | 'charge' | 'over'
  dispatch: (action: Action) => void
}) {
  return (
    <button
      className={
        actionButtonClassName +
        ' border-[#bcc8a62e] bg-[#ffffff04] text-[#d0b6e7] aria-pressed:border-[#c4a6db] aria-pressed:bg-[#9f82b933]'
      }
      data-action="special"
      disabled={!myTurn || attacking || !pawn || !canUseSpecial(pawn) || !hasSpecialTargets}
      title={pawn?.special.description}
      aria-pressed={usingSpecial}
      onClick={() =>
        dispatch(
          usingSpecial ? { type: 'cancelTargeting' } : { type: 'act', action: 'special' },
        )
      }
    >
      <Icon
        className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
        name={usingSpecial ? 'close' : 'spark'}
      />
      <span className="text-[13px] font-semibold whitespace-nowrap max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px]">
        {usingSpecial ? m.cancel : (pawn?.special.name ?? m.special)}
      </span>
      <small className="mt-0.5 block text-[9px] text-[#a1b29b] max-[601px]:mt-0">
        {usingSpecial
          ? !targetCount
            ? m.noTargets
            : phase === 'charge'
              ? m.chooseEnemy
              : (pawn?.special.prompt ?? m.chooseEnemy)
          : pawn?.special.oncePerRound && pawn.specialUsed
            ? m.usedThisRound
            : !hasSpecialTargets
              ? (pawn?.special.noTargets ?? m.noTargets)
              : m.energyCost(pawn?.special.cost ?? 2)}
      </small>
    </button>
  )
}

function EndTurnButton({
  pawn,
  myTurn,
  dispatch,
}: {
  pawn?: Pawn
  myTurn: boolean
  dispatch: (action: Action) => void
}) {
  return (
    <button
      className={actionButtonClassName + ' border-[#bcc8a62e] bg-[#ffffff04] text-[#e6e7d4]'}
      data-action="endTurn"
      disabled={!myTurn}
      onClick={() => dispatch({ type: 'endTurn' })}
      title={m.endTurnHint(pawn?.endTurnEscapeChance ?? 0)}
    >
      <Icon
        className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
        name="escape"
      />
      <span className="text-[13px] font-semibold whitespace-nowrap max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px]">
        {m.endTurn}
      </span>
      <small className="mt-0.5 block text-[9px] text-[#a1b29b] max-[601px]:mt-0">
        {m.escapeGain(pawn ? pawn.endTurnEscapeChance - pawn.escapeChance : 0)}
      </small>
    </button>
  )
}
