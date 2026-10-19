import { useLayoutEffect, useState, type CSSProperties } from 'react'
import type { GameState, Side } from '../lib/engine'
import { iconButtonClassName, primaryButtonClassName } from './styles'
import { Icon } from './Icon'
import * as m from '../i18n/game'
import * as b from '../i18n/briefing-popup'
import * as t from '../i18n/tour'

interface TourStep {
  readonly target: string
  readonly title: string
  readonly body: string
}

function tourSteps(state: GameState): readonly TourStep[] {
  const king = (side: Side) =>
    state.pawns.find((pawn) => pawn.side === side && pawn.kind === 'king')
  const playerKing = king('player')
  const enemyKing = king('enemy')
  return [
    { target: '[data-tour="turn-order"]', title: t.turnOrder, body: t.turnOrderBody },
    ...(playerKing
      ? [
          {
            target: `[data-pawn="${playerKing.id}"]`,
            title: t.yourKing,
            body: t.yourKingBody,
          },
        ]
      : []),
    ...(enemyKing
      ? [
          {
            target: `[data-pawn="${enemyKing.id}"]`,
            title: t.enemyKing,
            body: t.enemyKingBody,
          },
        ]
      : []),
    { target: '[data-action="move"]', title: m.move, body: t.moveBody },
    { target: '[data-action="special"]', title: t.specialAbility, body: t.specialBody },
    { target: '[data-action="endTurn"]', title: m.endTurn, body: t.endTurnBody },
  ]
}

// The spotlight follows the target element, so it is measured from the DOM and
// refreshed on resize and any scroll (the turn strip scrolls horizontally).
function useTargetRect(target: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const element = document.querySelector(target)
      setRect(element ? element.getBoundingClientRect() : null)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [target])
  return rect
}

const HOLE_PAD = 7
const CARD_GAP = 14

function cardPosition(rect: DOMRect | null): { style: CSSProperties; above: boolean } {
  if (!rect)
    return {
      style: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
      above: false,
    }
  const width = Math.min(340, window.innerWidth - 32)
  const centerX = rect.left + rect.width / 2
  const left = Math.min(Math.max(centerX - width / 2, 16), window.innerWidth - width - 16)
  // The card sits under the spotlight when it fits, above it otherwise.
  if (rect.bottom + CARD_GAP + 200 < window.innerHeight)
    return { style: { top: rect.bottom + CARD_GAP, left, width }, above: false }
  return {
    style: { top: rect.top - CARD_GAP, left, width, transform: 'translateY(-100%)' },
    above: true,
  }
}

export function GameTour({ state, onDone }: { state: GameState; onDone: () => void }) {
  const steps = tourSteps(state)
  const [step, setStep] = useState(0)
  const current = steps[step]
  const rect = useTargetRect(current.target)
  const last = step === steps.length - 1
  const next = () => (last ? onDone() : setStep(step + 1))
  const card = cardPosition(rect)

  const hole: CSSProperties | null = rect && {
    top: rect.top - HOLE_PAD,
    left: rect.left - HOLE_PAD,
    width: rect.width + HOLE_PAD * 2,
    height: rect.height + HOLE_PAD * 2,
  }

  return (
    <div
      className="fixed inset-0 z-50 isolate"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={next}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDone()
      }}
    >
      {hole ? (
        <>
          <div
            className="tour-spot pointer-events-none absolute rounded-xl border-2 border-gold shadow-[0_0_0_150vmax_#020a08b8]"
            style={hole}
          />
          <div
            className="tour-ring pointer-events-none absolute rounded-xl border-2 border-gold"
            style={hole}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#020a08b8]" />
      )}
      <div
        key={step}
        className={
          'tour-card absolute rounded-2xl border border-line bg-(--biome-panel) px-4 py-3.5 shadow-[0_16px_60px_#000c] motion-reduce:animate-none' +
          (card.above ? ' tour-card--above' : '')
        }
        style={card.style}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-gold uppercase">
          <Icon name="hex" className="size-3.5" />
          {t.title}
          <span className="text-muted tabular-nums">
            {step + 1}/{steps.length}
          </span>
        </p>
        <h2 className="mt-1.5 text-lg leading-tight font-extrabold tracking-tight text-ink">
          {current.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink">{current.body}</p>
        <div className="mt-3 flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              className={iconButtonClassName}
              onClick={() => setStep(step - 1)}
              aria-label={b.previous}
            >
              <Icon name="arrow" className="rotate-180" />
            </button>
          )}
          <button
            type="button"
            className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink"
            onClick={onDone}
          >
            {t.skip}
          </button>
          <button
            type="button"
            autoFocus
            className={primaryButtonClassName + ' min-h-11 rounded-xl px-4'}
            onClick={next}
          >
            {last ? m.go : b.next}
            <Icon name="arrow" />
          </button>
        </div>
      </div>
    </div>
  )
}
