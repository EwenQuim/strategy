import { useState, type RefObject } from 'react'
import type { Biome } from '../lib/engine'
import { INTRODUCTIONS, type BriefingElement } from '../briefings'
import * as common from '../i18n/common'
import * as game from '../i18n/game'
import * as m from '../i18n/help'
import { ElementArt, StatChip } from './BriefingElements'
import { Icon, type IconName } from './Icon'
import { dialogClassName, iconButtonClassName } from './styles'

const SHORTCUTS: readonly (readonly [keys: string, label: string])[] = [
  ['E', game.endTurn],
  ['M', game.move],
  ['A', game.special],
  ['Esc', game.cancel],
  ['H', game.howToPlay],
]

// The king entry holds the three core rules first, then the king unit card.
const BASICS = INTRODUCTIONS.king.slice(0, 3)
const UNITS = [
  INTRODUCTIONS.king[3],
  ...(
    [
      'swordsman',
      'archer',
      'magician',
      'bulwark',
      'bomber',
      'ninja',
      'hoplite',
      'wolf',
      'berserker',
      'lancer',
    ] as const
  ).map((kind) => INTRODUCTIONS[kind][0]),
]
const TERRAIN = (
  ['lake', 'mountain', 'sand', 'lava', 'watchtower', 'spring', 'rune'] as const
).map((kind) => INTRODUCTIONS[kind][0])

type Tab = 'basics' | 'units' | 'terrain' | 'keys'

const TABS: readonly { id: Tab; label: string; icon: IconName }[] = [
  { id: 'basics', label: m.basicsTitle, icon: 'crown' },
  { id: 'units', label: m.unitsTitle, icon: 'sword' },
  { id: 'terrain', label: m.terrainTitle, icon: 'hex' },
  { id: 'keys', label: m.shortcutsTab, icon: 'help' },
]

const rowClassName =
  'flex items-start gap-3 rounded-xl border border-line bg-[#ffffff06] px-3 py-2.5 max-[360px]:gap-2.5 max-[360px]:px-2.5 max-[360px]:py-2'

// One row layout for every briefing element: art or icon, name, then only the
// fields the element actually has (stats, special, points).
function CheatsheetRow({ element, index }: { element: BriefingElement; index: number }) {
  const detailed = element.stats !== undefined || element.special !== undefined
  return (
    <li className={rowClassName + (element.art && !detailed ? ' items-center' : '')}>
      {element.art ? (
        <ElementArt art={element.art} index={index} small />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-black/20 text-gold">
          <Icon name={element.icon ?? 'hex'} className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="font-serif text-[16px] leading-snug text-gold">
            {element.name}
          </strong>
          {element.stats && (
            <>
              <StatChip icon="heart" value={element.stats.hp} color="text-[#d59d81]" />
              <StatChip icon="sword" value={element.stats.damage} color="text-[#c4d1a5]" />
              <StatChip icon="target" value={element.stats.range} color="text-[#a4af99]" />
            </>
          )}
        </div>
        {element.special && (
          <p className="m-0 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-snug">
            <span className="font-semibold text-gold">{element.special.name}</span>
            <span className="inline-flex items-center gap-0.5 rounded bg-[#ffffff0d] px-1 py-px text-[11px] font-semibold text-[#b8c4e0]">
              <Icon name="energy" className="size-2.5" />
              {element.special.cost}
            </span>
            <span className="text-muted">{element.special.description}</span>
          </p>
        )}
        {element.points.length > 0 &&
          // Illustrated rows keep their caveats on one line; concept cards list them.
          (element.art ? (
            <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-muted">
              {element.points.join(' · ')}
            </p>
          ) : (
            <ul className="m-0 mt-1 list-none space-y-1 p-0 text-[13px] leading-snug text-muted">
              {element.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ))}
      </div>
    </li>
  )
}

function CheatsheetList({ elements }: { elements: readonly BriefingElement[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 pt-5">
      {elements.map((element, index) => (
        <CheatsheetRow key={element.name} element={element} index={index} />
      ))}
    </ul>
  )
}

function ShortcutsPanel() {
  return (
    <section className="pt-5" aria-labelledby="shortcuts-title">
      <h3 className="m-0 font-serif text-[19px] leading-snug text-gold" id="shortcuts-title">
        {m.shortcutsTitle}
      </h3>
      <ul className="mt-2.5 flex list-none flex-col gap-1.5 p-0 text-[13px] text-muted">
        {SHORTCUTS.map(([keys, label]) => (
          <li key={keys} className="flex items-center gap-3">
            <kbd className="inline-flex min-w-7 justify-center rounded-md border border-line bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-ink">
              {keys}
            </kbd>
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}

interface GameHelpDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  biome: Biome
}

export function GameHelpDialog({ dialogRef, biome }: GameHelpDialogProps) {
  // Units are the reference players come back to; basics are covered by the tutorial.
  const [tab, setTab] = useState<Tab>('units')
  const elements =
    tab === 'basics'
      ? BASICS
      : tab === 'units'
        ? UNITS
        : tab === 'terrain'
          ? [...TERRAIN, ...(biome === 'hell' ? INTRODUCTIONS.hell : [])]
          : undefined

  return (
    <dialog
      ref={dialogRef}
      className={dialogClassName}
      aria-labelledby="dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close()
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-line px-6 pt-6 pb-4 [&>button]:shrink-0">
        <h2 className="font-serif text-[30px] leading-tight" id="dialog-title">
          {game.howToPlay}
        </h2>
        <button
          className={iconButtonClassName}
          onClick={() => dialogRef.current?.close()}
          aria-label={common.closeDialog}
        >
          <Icon name="close" />
        </button>
      </div>
      {/* Shortcuts need a keyboard, so touch-only players never see that tab. */}
      <div
        role="tablist"
        aria-label={game.howToPlay}
        className="flex shrink-0 gap-1 border-b border-line px-4 pt-1.5 pb-1.5"
      >
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-semibold leading-none transition-colors [&>svg]:size-3.5 ' +
              (tab === id
                ? 'bg-[#ffffff0d] text-gold'
                : 'text-muted hover:bg-[#ffffff06] hover:text-ink') +
              (id === 'keys' ? ' hidden [@media(pointer:fine)]:flex' : '')
            }
          >
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 max-[360px]:px-4"
        role="tabpanel"
      >
        {elements ? <CheatsheetList elements={elements} /> : <ShortcutsPanel />}
      </div>
    </dialog>
  )
}
