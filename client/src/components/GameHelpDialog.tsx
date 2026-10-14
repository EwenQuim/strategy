import type { RefObject } from 'react'
import type { Biome } from '../lib/engine'
import { INTRODUCTIONS } from '../briefings'
import * as common from '../i18n/common'
import * as game from '../i18n/game'
import * as m from '../i18n/help'
import { threatZone } from '../i18n/battlefield'
import { BriefingElements } from './BriefingElements'
import { Icon } from './Icon'
import { dialogClassName, iconButtonClassName } from './styles'

const SHORTCUTS: readonly (readonly [keys: string, label: string])[] = [
  ['E', game.endTurn],
  ['A', game.special],
  ['Esc', game.cancel],
  ['T', threatZone],
  ['H', game.howToPlay],
]

interface GameHelpDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  biome: Biome
}

export function GameHelpDialog({ dialogRef, biome }: GameHelpDialogProps) {
  const { hell, ...elements } = INTRODUCTIONS
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
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <BriefingElements
          elements={[...Object.values(elements).flat(), ...(biome === 'hell' ? hell : [])]}
        />
        {/* Shortcuts need a keyboard, so touch-only players never see this section. */}
        <section
          className="mt-5 hidden border-t border-line pt-4 [@media(pointer:fine)]:block"
          aria-labelledby="shortcuts-title"
        >
          <h3 className="font-serif text-[19px] leading-snug text-gold" id="shortcuts-title">
            {m.shortcutsTitle}
          </h3>
          <ul className="mt-2 flex list-none flex-col gap-1.5 p-0 text-[13px] text-muted">
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
      </div>
    </dialog>
  )
}
