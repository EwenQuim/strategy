import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { GameState, Side } from '../lib/engine'
import { buttonClassName, iconButtonClassName } from './styles'
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

function cardPosition(rect: DOMRect | null, height: number): CSSProperties {
  const width = Math.min(340, window.innerWidth - 32)
  const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const left = Math.min(Math.max(centerX - width / 2, 16), window.innerWidth - width - 16)
  const top = rect
    ? rect.bottom + CARD_GAP + height <= window.innerHeight - 16
      ? rect.bottom + CARD_GAP
      : rect.top - CARD_GAP - height
    : (window.innerHeight - height) / 2
  return {
    top: Math.max(16, Math.min(top, window.innerHeight - height - 16)),
    left,
    width,
  }
}

export function GameTour({ state, onDone }: { state: GameState; onDone: () => void }) {
  const steps = tourSteps(state)
  const [step, setStep] = useState(0)
  const current = steps[step]
  const rect = useTargetRect(current.target)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(200)
  useLayoutEffect(() => {
    const element = cardRef.current
    if (!element) return
    const measure = () => setCardHeight(element.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [step])
  const last = step === steps.length - 1
  const next = () => (last ? onDone() : setStep(step + 1))
  const card = cardPosition(rect, cardHeight)

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
        if (event.key === 'Tab') {
          const buttons = event.currentTarget.querySelectorAll('button')
          const first = buttons[0]
          const lastButton = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            lastButton.focus()
          } else if (!event.shiftKey && document.activeElement === lastButton) {
            event.preventDefault()
            first.focus()
          }
        }
      }}
    >
      {hole ? (
        <>
          <div
            className="pointer-events-none absolute rounded-xl border border-gold/80 shadow-[0_0_0_150vmax_#020a08c7]"
            style={hole}
          />
          <div
            className="tour-ring pointer-events-none absolute rounded-xl shadow-[0_0_20px_#e9d49a30,inset_0_0_12px_#e9d49a15] motion-reduce:animate-none"
            style={hole}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#020a08c7]" />
      )}
      <div
        key={step}
        ref={cardRef}
        className="tour-card absolute max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-gold/30 bg-(--biome-panel) bg-linear-to-br from-white/7 to-transparent p-4 shadow-[0_20px_60px_#0009,inset_0_1px_0_#ffffff0d] motion-reduce:animate-none"
        style={card}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
            <Icon name="hex" className="size-3.5 shrink-0" />
            {t.title}
            <span className="tracking-normal text-muted tabular-nums">
              {step + 1}/{steps.length}
            </span>
          </p>
          <button
            type="button"
            className="-my-2 -mr-2 min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-white/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            onClick={onDone}
          >
            {t.skip}
          </button>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {steps.map((item, index) => (
            <span
              key={item.target}
              className={
                'h-0.5 flex-1 rounded-full ' + (index <= step ? 'bg-gold' : 'bg-gold/15')
              }
            />
          ))}
        </div>
        <h2 className="mt-3 text-xl leading-tight font-extrabold tracking-tight text-ink">
          {current.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink/80">{current.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          {step > 0 && (
            <button
              type="button"
              className={
                iconButtonClassName + ' focus-visible:outline-2 focus-visible:outline-gold'
              }
              onClick={() => setStep(step - 1)}
              aria-label={b.previous}
            >
              <Icon name="arrow" className="rotate-180" />
            </button>
          )}
          <button
            type="button"
            autoFocus
            className={
              buttonClassName +
              ' ml-auto min-h-11 justify-center gap-3 rounded-xl border-transparent bg-gold bg-linear-to-b from-white/20 to-transparent px-4 text-[15px] text-[var(--biome-panel,#20362b)] shadow-[0_2px_0_#0003,inset_0_1px_0_#fff4] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:translate-y-px'
            }
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
