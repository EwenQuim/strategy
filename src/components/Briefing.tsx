import { buttonClassName, iconButtonClassName } from './styles'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from './Icon'
import { readHideFutureHints, writeHideFutureHints } from '../campaignProgress'
import type { CampaignLevel } from '../lib/campaign'

export function Briefing({ level, onStart }: { level: CampaignLevel; onStart: () => void }) {
  const [hideFutureHints, setHideFutureHints] = useState(readHideFutureHints)
  const [showElements] = useState(() => !readHideFutureHints())
  return (
    <main className="m-auto flex h-dvh max-w-[800px] flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))]">
      <header className="flex items-center justify-between gap-3">
        <div>
          <span className="text-muted text-[9px] font-semibold tracking-[0.17em] uppercase">
            Level {String(level.id).padStart(2, '0')}
          </span>
          <h1 className="mt-1 font-serif text-[32px] leading-[normal]">{level.name}</h1>
        </div>
        <Link to="/campaign" className={iconButtonClassName} aria-label="Back to campaign">
          <Icon name="close" />
        </Link>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
        <p className="m-0 font-serif text-[16px] leading-[1.5] italic">
          {level.intro.roleplay}
        </p>
        {showElements && level.intro.newElements.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {level.intro.newElements.map((element) => (
              <li
                className="rounded-lg border border-line bg-[#ffffff04] px-3 py-2.5"
                key={element.name}
              >
                <strong className="mb-1 block text-[13px] text-gold">{element.name}</strong>
                <p className="m-0 text-[12px] leading-[1.5] text-muted">
                  {element.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="flex items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[11px] text-muted">
          <input
            className="size-[18px] accent-gold"
            type="checkbox"
            checked={hideFutureHints}
            onChange={() => {
              setHideFutureHints(!hideFutureHints)
              writeHideFutureHints(!hideFutureHints)
            }}
          />
          Hide future hints
        </label>
        <button
          type="button"
          className={
            buttonClassName +
            ' min-h-13 justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'
          }
          onClick={onStart}
        >
          Go !
        </button>
      </footer>
    </main>
  )
}
