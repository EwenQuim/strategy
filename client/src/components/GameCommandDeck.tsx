import type { Action, Aim, Pawn, RangeKind, Side } from '../lib/engine'
import { canUseSpecial } from '../lib/engine'
import * as m from '../i18n/game'
import { attackSummary } from '../i18n/battlefield'
import { specialTexts, unitNames } from '../i18n/units'
import { Icon, PawnIcon } from './Icon'
import { usePreviewButton, type PreviewProps } from './usePreviewButton'
import { UnitStats } from './UnitStats'

const actionButtonClassName =
  'grid min-h-16 select-none [-webkit-touch-callout:none] aria-disabled:cursor-help aria-disabled:not-aria-pressed:opacity-38 grid-cols-[auto_1fr] items-center gap-x-2.5 rounded-[9px] border px-4 py-3 text-left [&:enabled:not([aria-disabled=true]):hover]:border-[#bcc8a670] [&:enabled:not([aria-disabled=true]):hover]:bg-[#ffffff0c] max-[601px]:min-h-[76px] max-[601px]:grid-cols-1 max-[601px]:justify-items-center max-[601px]:gap-y-[3px] max-[601px]:rounded-lg max-[601px]:px-0.5 max-[601px]:pt-[9px] max-[601px]:pb-2 max-[601px]:text-center [@media(max-height:650px)]:min-h-[65px] [@media(max-height:650px)]:py-1.5 [@media(min-width:600px)_and_(max-height:480px)]:min-h-12 [@media(min-width:600px)_and_(max-height:480px)]:px-3 [@media(min-width:600px)_and_(max-height:480px)]:py-1.5'

interface GameCommandDeckProps {
  pawn?: Pawn
  active?: Pawn
  winner: Side | 'draw' | null
  winnerLabel: string | null
  myTurn: boolean
  commanding: boolean
  previewed: RangeKind | null
  onPreview: (range: RangeKind) => void
  onPeek: (range: RangeKind | null) => void
  attacking: boolean
  usingSpecial: boolean
  hasFoes: boolean
  hasSpecialTargets: boolean
  choosingTarget: boolean
  targetCount: number
  dispatch: (action: Action) => void
  onAim: (aim: Aim | null) => void
}

export function GameCommandDeck({
  pawn,
  active,
  winner,
  winnerLabel,
  myTurn,
  commanding,
  previewed,
  onPreview,
  onPeek,
  attacking,
  usingSpecial,
  hasFoes,
  hasSpecialTargets,
  choosingTarget,
  targetCount,
  dispatch,
  onAim,
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
                  : pawn
                    ? unitNames[pawn.kind]
                    : m.yourGuard}
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
            commanding={commanding}
            previewed={previewed === 'attack'}
            attacking={attacking}
            usingSpecial={usingSpecial}
            hasFoes={hasFoes}
            onAim={onAim}
            onPreview={onPreview}
            onPeek={onPeek}
          />
          <SpecialButton
            pawn={pawn}
            commanding={commanding}
            previewed={previewed === 'special'}
            attacking={attacking}
            usingSpecial={usingSpecial}
            hasSpecialTargets={hasSpecialTargets}
            targetCount={targetCount}
            choosingTarget={choosingTarget}
            dispatch={dispatch}
            onAim={onAim}
            onPreview={onPreview}
            onPeek={onPeek}
          />
          <EndTurnButton pawn={active} myTurn={myTurn} dispatch={dispatch} />
        </div>
      </div>
    </footer>
  )
}

function AttackButton({
  pawn,
  attacking,
  usingSpecial,
  hasFoes,
  onAim,
  ...preview
}: {
  pawn?: Pawn
  attacking: boolean
  usingSpecial: boolean
  hasFoes: boolean
  onAim: (aim: Aim | null) => void
} & PreviewProps) {
  const buttonProps = usePreviewButton(
    'attack',
    !preview.commanding || usingSpecial || !pawn?.energy || (!attacking && !hasFoes),
    () => onAim(attacking ? null : { action: 'attack' }),
    preview,
  )
  return (
    <button
      className={
        actionButtonClassName +
        ' border-[#d69e803d] bg-[#b8795809] text-[#e3b096] aria-pressed:border-[#e0a586] aria-pressed:bg-[#ab695333]'
      }
      data-action="attack"
      {...buttonProps}
      aria-pressed={attacking || preview.previewed}
    >
      <Icon
        className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
        name={attacking ? 'close' : 'sword'}
      />
      <span className="text-[13px] font-semibold whitespace-nowrap max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px]">
        {attacking ? m.cancel : m.attack}
      </span>
      <small className="mt-0.5 block text-[9px] max-[601px]:mt-0 max-[601px]:text-[8px] text-[#b5a997]">
        {attacking
          ? m.chooseEnemy
          : preview.commanding || !pawn
            ? m.energyCost(1)
            : attackSummary(pawn.attack.damage, attackSpan(pawn))}
      </small>
    </button>
  )
}

function attackSpan({ attack }: Pawn) {
  return attack.minRange === attack.maxRange
    ? String(attack.maxRange)
    : attack.minRange + '-' + attack.maxRange
}

function SpecialButton({
  pawn,
  attacking,
  usingSpecial,
  hasSpecialTargets,
  targetCount,
  choosingTarget,
  dispatch,
  onAim,
  ...preview
}: {
  pawn?: Pawn
  attacking: boolean
  usingSpecial: boolean
  hasSpecialTargets: boolean
  targetCount: number
  choosingTarget: boolean
  dispatch: (action: Action) => void
  onAim: (aim: Aim | null) => void
} & PreviewProps) {
  const buttonProps = usePreviewButton(
    'special',
    !preview.commanding || attacking || !pawn || !canUseSpecial(pawn) || !hasSpecialTargets,
    () => {
      if (usingSpecial) onAim(null)
      else if (pawn?.special.targeted) onAim({ action: 'special' })
      else dispatch({ type: 'special' })
    },
    preview,
  )
  return (
    <button
      className={
        actionButtonClassName +
        ' border-[#bcc8a62e] bg-[#ffffff04] text-[#d0b6e7] aria-pressed:border-[#c4a6db] aria-pressed:bg-[#9f82b933]'
      }
      data-action="special"
      {...buttonProps}
      title={pawn ? specialTexts[pawn.special.description] : undefined}
      aria-pressed={usingSpecial || preview.previewed}
    >
      <Icon
        className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
        name={usingSpecial ? 'close' : 'spark'}
      />
      <span className="text-[13px] font-semibold whitespace-nowrap max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px]">
        {usingSpecial ? m.cancel : pawn ? specialTexts[pawn.special.name] : m.special}
      </span>
      <small className="mt-0.5 block text-[9px] text-[#a1b29b] max-[601px]:mt-0 max-[601px]:text-[8px]">
        {usingSpecial
          ? !targetCount
            ? m.noTargets
            : choosingTarget
              ? m.chooseEnemy
              : pawn?.special.prompt
                ? specialTexts[pawn.special.prompt]
                : m.chooseEnemy
          : !preview.commanding
            ? m.energyCost(pawn?.special.cost ?? 2)
            : pawn?.special.oncePerRound && pawn.specialUsed
              ? m.usedThisRound
              : !hasSpecialTargets
                ? pawn?.special.noTargets
                  ? specialTexts[pawn.special.noTargets]
                  : m.noTargets
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
      <small className="mt-0.5 block text-[9px] text-[#a1b29b] max-[601px]:mt-0 max-[601px]:text-[8px]">
        {m.escapeGain(pawn ? pawn.endTurnEscapeChance - pawn.escapeChance : 0)}
      </small>
    </button>
  )
}
