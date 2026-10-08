import { iconButtonClassName } from '../components/styles'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import { Icon } from '../components/Icon'
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
      <main className="m-auto flex h-dvh max-w-[800px] flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))]">
        <header className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-[32px] leading-[normal]">{m.settings}</h1>
          <Link to="/" className={iconButtonClassName} aria-label={common.backToHome}>
            <Icon name="close" />
          </Link>
        </header>
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
        <label className="flex items-center justify-between gap-4 rounded-lg border border-line p-4">
          <span className="flex flex-col gap-1">
            <strong className="text-[14px]">{m.haptics}</strong>
            <small className="text-[12px] text-muted">{m.hapticsHint}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="size-[18px] shrink-0 accent-gold"
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
      </main>
    )
  },
})
