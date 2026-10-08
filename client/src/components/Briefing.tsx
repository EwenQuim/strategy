import { useId, useRef, useState, type CSSProperties } from 'react'
import { iconButtonClassName, primaryButtonClassName } from './styles'
import { Icon } from './Icon'
import { ElementArt } from './BriefingElements'
import { markTutorialSeen, readTutorialSeen } from '../tutorial'
import type { CampaignLevel } from '../lib/campaign'
import { ELEMENT_ACCENTS, INTRODUCTIONS, type BriefingElement } from '../briefings'
import { BIOMES } from '../lib/engine'
import * as common from '../i18n/common'
import * as h from '../i18n/help'
import * as m from '../i18n/game'
import * as b from '../i18n/briefing-popup'

function showBriefing(dialog: HTMLDialogElement) {
  dialog.showModal()
  return () => dialog.close()
}

function BriefingPopup({
  title,
  elements,
  theme,
  intro,
  onClose,
}: {
  title: string
  elements: readonly BriefingElement[]
  theme?: CSSProperties
  intro?: string
  onClose?: () => void
}) {
  const [page, setPage] = useState(0)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const id = useId()
  const element = elements[page]
  const accent = (element.art && ELEMENT_ACCENTS[element.art]) || 'var(--gold)'

  return (
    <dialog
      ref={showBriefing}
      onClose={onClose}
      className="fixed inset-x-0 top-[env(safe-area-inset-top)] bottom-[env(safe-area-inset-bottom)] isolate m-auto max-h-[min(760px,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-24px))] w-[min(440px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] border border-gold/25 bg-[var(--biome-panel,#172a21)] p-0 text-ink shadow-[0_32px_120px_#000b,inset_0_1px_0_#ffffff18] open:flex backdrop:bg-black/65 backdrop:backdrop-blur-[9px]"
      style={{ ...theme, '--briefing-accent': accent } as CSSProperties}
      aria-labelledby={id + '-title'}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-1 overflow-hidden bg-[radial-gradient(ellipse_at_50%_15%,color-mix(in_srgb,var(--briefing-accent)_28%,transparent),transparent_60%),linear-gradient(160deg,#ffffff08,transparent_40%,#0006)]"
      >
        <svg className="absolute inset-x-0 top-0 h-[360px] w-full text-gold/10 mask-[linear-gradient(#000,transparent)]">
          <defs>
            <pattern id={id + '-grid'} width="56" height="96" patternUnits="userSpaceOnUse">
              <path
                d="M28 0 56 16v32L28 64 0 48V16ZM0 48v32l28 16 28-16V48"
                fill="none"
                stroke="currentColor"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={'url(#' + id + '-grid)'} />
        </svg>
        <div className="absolute -top-36 left-1/2 h-[400px] w-px -rotate-35 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      </div>
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3">
        <h2
          id={id + '-title'}
          className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-gold uppercase"
        >
          <Icon name="hex" className="size-4" />
          {title}
        </h2>
        <form method="dialog">
          <button type="submit" className={iconButtonClassName} aria-label={common.closeDialog}>
            <Icon name="close" />
          </button>
        </form>
      </header>
      <div
        className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden"
        onTouchStart={(event) => {
          const touch = event.touches[0]
          swipeStart.current = { x: touch.clientX, y: touch.clientY }
        }}
        onTouchEnd={(event) => {
          const start = swipeStart.current
          if (!start) return
          const touch = event.changedTouches[0]
          const dx = touch.clientX - start.x
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(touch.clientY - start.y)) return
          setPage(Math.min(Math.max(page - Math.sign(dx), 0), elements.length - 1))
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        <section
          key={page}
          aria-label={element.name}
          className="briefing-card min-h-0 overflow-y-auto overscroll-contain px-5 pb-4 motion-reduce:animate-none max-[360px]:px-4"
        >
          <div className="relative grid justify-items-center pt-3 pb-5 [@media(max-height:650px)]:pt-0 [@media(max-height:650px)]:pb-3">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-1/2 -z-1 size-[230px] -translate-x-1/2 rounded-full border border-gold/10 bg-[radial-gradient(circle,color-mix(in_srgb,var(--briefing-accent)_22%,transparent),transparent_68%)] max-[360px]:size-[196px] [@media(max-height:650px)]:size-[172px]"
            >
              <div className="absolute inset-4 rounded-full border border-dashed border-gold/10" />
            </div>
            {element.art ? (
              <ElementArt art={element.art} index={0} hero />
            ) : (
              <div className="briefing-art-icon grid size-[164px] place-items-center text-gold drop-shadow-[0_8px_24px_#0006] motion-reduce:animate-none max-[360px]:size-[136px] [@media(max-height:650px)]:size-[112px]">
                <Icon
                  name={element.icon ?? 'hex'}
                  className="size-[76px] [@media(max-height:650px)]:size-14"
                />
              </div>
            )}
            <h3 className="mt-2 text-center text-[32px] leading-tight font-extrabold tracking-tight text-ink max-[360px]:text-[28px] [@media(max-height:650px)]:mt-0">
              {element.name}
            </h3>
          </div>
          {element.stats && (
            <dl className="mb-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-black/20 py-3 text-center">
              {(
                [
                  ['heart', m.health, element.stats.hp, 'text-[#e6a38d]'],
                  ['sword', b.damage, element.stats.damage, 'text-gold'],
                  ['target', b.range, element.stats.range, 'text-[#b4c9db]'],
                ] as const
              ).map(([icon, label, value, color]) => (
                <div key={icon}>
                  <dt className="text-[10px] text-muted">{label}</dt>
                  <dd className="mt-1 flex items-center justify-center gap-1.5 text-xl leading-none font-bold tabular-nums">
                    <Icon name={icon} className={'size-3.5 ' + color} />
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {element.special && (
            <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gold">
                  <Icon name="spark" className="size-4 shrink-0" />
                  {element.special.name}
                </h4>
                <span
                  className="flex shrink-0 items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-xs font-bold text-gold"
                  aria-label={m.energyCost(element.special.cost)}
                >
                  <Icon name="energy" className="size-3" />
                  {element.special.cost}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-ink">{element.special.description}</p>
            </div>
          )}
          {element.points.length > 0 && (
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {element.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 rounded-xl bg-black/15 px-3 py-2.5 text-[13px] leading-relaxed text-ink"
                >
                  <Icon name="hex" className="mt-1 size-3 shrink-0 text-gold/60" />
                  {point}
                </li>
              ))}
            </ul>
          )}
          {intro && page === 0 && (
            <p className="mt-4 text-xs leading-relaxed text-muted">{intro}</p>
          )}
        </section>
      </div>
      <footer className="shrink-0 border-t border-line bg-black/15 px-5 pt-2 pb-5 max-[360px]:px-4 [@media(max-height:650px)]:pb-3">
        {elements.length > 1 && (
          <nav aria-label={title} className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className={iconButtonClassName}
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              aria-label={b.previous}
            >
              <Icon name="arrow" className="rotate-180" />
            </button>
            <div className="flex min-w-0 items-center justify-center">
              {elements.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className="grid h-11 w-8 place-items-center rounded-lg"
                  aria-label={b.showElement(item.name)}
                  aria-current={page === index ? 'step' : undefined}
                  onClick={() => setPage(index)}
                >
                  <span
                    className={
                      page === index
                        ? 'h-1.5 w-5 rounded-full bg-gold'
                        : 'size-1.5 rounded-full bg-gold/25'
                    }
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              className={iconButtonClassName}
              disabled={page === elements.length - 1}
              onClick={() => setPage(page + 1)}
              aria-label={b.next}
            >
              <Icon name="arrow" />
            </button>
          </nav>
        )}
        <form method="dialog">
          <button
            type="submit"
            className={
              primaryButtonClassName +
              ' min-h-12 w-full rounded-xl bg-gradient-to-b from-[#f2dfac] to-gold shadow-[0_4px_0_#0003,inset_0_1px_0_#fff7] active:translate-y-px'
            }
          >
            <Icon name="sword" />
            {m.go}
            <Icon name="arrow" />
          </button>
        </form>
      </footer>
    </dialog>
  )
}

export function Briefing({ level }: { level: CampaignLevel }) {
  return (
    <BriefingPopup
      title={b.title}
      theme={BIOMES[level.setup.biome].theme}
      elements={level.newElements.flatMap((element) => INTRODUCTIONS[element])}
    />
  )
}

export function QuickPlayTutorial() {
  const [seen] = useState(readTutorialSeen)
  if (seen) return null
  return (
    <BriefingPopup
      title={common.quickPlay}
      elements={INTRODUCTIONS.king}
      intro={h.randomIntro + ' ' + h.aiPlayers + '. ' + h.turnOrder + '.'}
      onClose={markTutorialSeen}
    />
  )
}
