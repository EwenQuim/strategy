import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MenuLayout } from '../components/MenuLayout'
import { menuCardClassName } from '../components/styles'
import * as m from '../i18n/menus'
import { ApiKeyField } from '../components/ApiKeyField'
import {
  readDeveloperPreview,
  saveDeveloperPreview,
  readHapticsEnabled,
  saveHapticsEnabled,
} from '../preferences'
import { readMistralApiKey, saveMistralApiKey } from '../api/mistralBot'
import { readJevApiKey, saveJevApiKey } from '../api/jevBot'

export const Route = createFileRoute('/settings')({
  component: function Settings() {
    const [developerPreview, setDeveloperPreview] = useState(readDeveloperPreview)
    const [hapticsEnabled, setHapticsEnabled] = useState(readHapticsEnabled)
    const [mistralKey, setMistralKey] = useState(() => readMistralApiKey() ?? '')
    const [jevKey, setJevKey] = useState(() => readJevApiKey() ?? '')
    return (
      <MenuLayout title={m.settings}>
        <label className={menuCardClassName + ' flex cursor-pointer items-start gap-3 p-3'}>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <strong className="text-sm">{m.developerPreview}</strong>
            <small id="developer-preview-hint" className="text-xs leading-relaxed text-muted">
              {m.developerPreviewHint}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={m.developerPreview}
            aria-describedby="developer-preview-hint"
            className="relative mt-1 h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-white/10 transition-colors after:absolute after:top-1 after:left-1 after:size-[18px] after:rounded-full after:bg-muted after:transition-transform checked:bg-gold checked:after:translate-x-5 checked:after:bg-[#172a21] motion-reduce:transition-none motion-reduce:after:transition-none"
            checked={developerPreview}
            onChange={(event) => {
              setDeveloperPreview(event.target.checked)
              saveDeveloperPreview(event.target.checked)
            }}
          />
        </label>
        <label className={menuCardClassName + ' flex cursor-pointer items-start gap-3 p-3'}>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <strong className="text-sm">{m.haptics}</strong>
            <small id="haptics-hint" className="text-xs leading-relaxed text-muted">
              {m.hapticsHint}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={m.haptics}
            aria-describedby="haptics-hint"
            className="relative mt-1 h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-white/10 transition-colors after:absolute after:top-1 after:left-1 after:size-[18px] after:rounded-full after:bg-muted after:transition-transform checked:bg-gold checked:after:translate-x-5 checked:after:bg-[#172a21] motion-reduce:transition-none motion-reduce:after:transition-none"
            checked={hapticsEnabled}
            onChange={(event) => {
              setHapticsEnabled(event.target.checked)
              saveHapticsEnabled(event.target.checked)
            }}
          />
        </label>
        {developerPreview && (
          <>
            <ApiKeyField
              label={m.mistralApiKey}
              hint={m.mistralApiKeyHint}
              value={mistralKey}
              onChange={(key) => {
                setMistralKey(key)
                saveMistralApiKey(key)
              }}
            />
            <ApiKeyField
              label={m.jevApiKey}
              hint={m.jevApiKeyHint}
              value={jevKey}
              onChange={(key) => {
                setJevKey(key)
                saveJevApiKey(key)
              }}
            />
          </>
        )}
        <div className="mt-auto py-3 text-center text-[11px] leading-relaxed text-muted">
          <p title={m.buildHint}>{m.build(import.meta.env.VITE_GIT_COMMIT)}</p>
          <p>{m.madeBy}</p>
        </div>
      </MenuLayout>
    )
  },
})
