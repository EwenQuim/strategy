import { iconButtonClassName } from '../components/styles'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import * as c from '../i18n/cosmetics'
import { Icon } from '../components/Icon'
import { readDeveloperPreview, saveDeveloperPreview } from '../preferences'
import {
  availableCosmetics,
  COSMETICS,
  readCosmeticPreference,
  saveCosmeticPreference,
} from '../cosmetics'
import { readUnlockedAchievements } from '../achievementProgress'

const skinDotClassName =
  'size-11 shrink-0 rounded-full border-2 border-line transition-transform disabled:opacity-40 enabled:hover:scale-110 data-[selected=true]:border-gold'

export const Route = createFileRoute('/settings')({
  component: function Settings() {
    const [developerPreview, setDeveloperPreview] = useState(readDeveloperPreview)
    const [skin, setSkin] = useState(readCosmeticPreference)
    const achievements = readUnlockedAchievements().length
    const unlocked = availableCosmetics(achievements)
    return (
      <main className="m-auto flex h-dvh max-w-[800px] flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))]">
        <header className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-[32px] leading-[normal]">{m.settings}</h1>
          <Link to="/" className={iconButtonClassName} aria-label={common.backToHome}>
            <Icon name="close" />
          </Link>
        </header>
        <section className="flex flex-col gap-2 rounded-lg border border-line p-4">
          <strong className="text-[14px]">{c.pawnSkins}</strong>
          <small className="text-[12px] text-muted">
            {c.pawnSkinsHint(unlocked.length, COSMETICS.length)}
          </small>
          <div className="flex flex-wrap gap-2">
            {COSMETICS.map((cosmetic) => {
              const available = unlocked.some(({ id }) => id === cosmetic.id)
              const selected = skin === cosmetic.id
              return (
                <button
                  key={cosmetic.id}
                  type="button"
                  className={skinDotClassName}
                  style={{
                    background:
                      'linear-gradient(' + cosmetic.base[1] + ',' + cosmetic.base[0] + ')',
                    boxShadow: 'inset 0 0 0 2px ' + cosmetic.rim,
                  }}
                  data-selected={selected || undefined}
                  disabled={!available}
                  aria-label={
                    available
                      ? c.cosmeticNames[cosmetic.id]
                      : c.lockedSkin(
                          c.cosmeticNames[cosmetic.id],
                          cosmetic.requiredAchievements,
                        )
                  }
                  aria-pressed={selected}
                  onClick={() => {
                    setSkin(cosmetic.id)
                    saveCosmeticPreference(cosmetic.id)
                  }}
                />
              )
            })}
          </div>
        </section>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-line p-4">
          <span className="flex flex-col gap-1">
            <strong className="text-[14px]">{m.developerPreview}</strong>
            <small className="text-[12px] text-muted">{m.developerPreviewHint}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="size-[18px] shrink-0 accent-gold"
            checked={developerPreview}
            onChange={(event) => {
              setDeveloperPreview(event.target.checked)
              saveDeveloperPreview(event.target.checked)
            }}
          />
        </label>
      </main>
    )
  },
})
