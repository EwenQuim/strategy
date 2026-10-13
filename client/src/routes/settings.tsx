import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { MenuLayout } from '../components/MenuLayout'
import {
  dialogClassName,
  iconButtonClassName,
  menuCardClassName,
  switchClassName,
} from '../components/styles'
import { Icon } from '../components/Icon'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import * as s from '../i18n/settings'
import { cancel } from '../i18n/game'
import { ApiKeyField } from '../components/ApiKeyField'
import {
  readDeveloperPreview,
  saveDeveloperPreview,
  readHapticsEnabled,
  saveHapticsEnabled,
} from '../preferences'
import { clearLocalData } from '../localData'
import {
  readMistralApiKey,
  saveMistralApiKey,
  readJevApiKey,
  saveJevApiKey,
} from '../bots/apiKeys'

export const Route = createFileRoute('/settings')({
  component: function Settings() {
    const [developerPreview, setDeveloperPreview] = useState(readDeveloperPreview)
    const [hapticsEnabled, setHapticsEnabled] = useState(readHapticsEnabled)
    const [mistralKey, setMistralKey] = useState(() => readMistralApiKey() ?? '')
    const [jevKey, setJevKey] = useState(() => readJevApiKey() ?? '')
    const deleteDialogRef = useRef<HTMLDialogElement>(null)
    return (
      <MenuLayout title={s.settings}>
        <label
          className={
            menuCardClassName +
            ' flex cursor-pointer items-start gap-3 p-4 min-[900px]:gap-5 min-[900px]:p-6'
          }
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <strong className="text-base">{s.developerPreview}</strong>
            <small id="developer-preview-hint" className="text-sm leading-relaxed text-muted">
              {s.developerPreviewHint}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={s.developerPreview}
            aria-describedby="developer-preview-hint"
            className={switchClassName + ' mt-1'}
            checked={developerPreview}
            onChange={(event) => {
              setDeveloperPreview(event.target.checked)
              saveDeveloperPreview(event.target.checked)
            }}
          />
        </label>
        <label
          className={
            menuCardClassName +
            ' flex cursor-pointer items-start gap-3 p-4 min-[900px]:gap-5 min-[900px]:p-6'
          }
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <strong className="text-base">{s.haptics}</strong>
            <small id="haptics-hint" className="text-sm leading-relaxed text-muted">
              {s.hapticsHint}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={s.haptics}
            aria-describedby="haptics-hint"
            className={switchClassName + ' mt-1'}
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
              label={s.mistralApiKey}
              hint={s.mistralApiKeyHint}
              value={mistralKey}
              onChange={(key) => {
                setMistralKey(key)
                saveMistralApiKey(key)
              }}
            />
            <ApiKeyField
              label={s.jevApiKey}
              hint={s.jevApiKeyHint}
              value={jevKey}
              onChange={(key) => {
                setJevKey(key)
                saveJevApiKey(key)
              }}
            />
          </>
        )}
        <button
          type="button"
          className={
            menuCardClassName +
            ' flex w-full flex-col gap-1.5 p-4 text-left min-[900px]:p-6 [&:hover>strong]:text-red-200'
          }
          onClick={() => deleteDialogRef.current?.showModal()}
        >
          <strong className="text-base">{s.deleteData}</strong>
          <small className="text-sm leading-relaxed text-muted">{s.deleteDataHint}</small>
        </button>
        <dialog
          ref={deleteDialogRef}
          className={dialogClassName}
          aria-labelledby="delete-data-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) deleteDialogRef.current?.close()
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-line px-6 pt-6 pb-4 [&>button]:shrink-0">
            <h2 className="font-serif text-[30px] leading-tight" id="delete-data-title">
              {s.deleteDataWarningTitle}
            </h2>
            <button
              className={iconButtonClassName}
              onClick={() => deleteDialogRef.current?.close()}
              aria-label={common.closeDialog}
            >
              <Icon name="close" />
            </button>
          </div>
          <p className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 text-[14px] leading-normal text-muted">
            {s.deleteDataWarning}
          </p>
          <div className="flex shrink-0 flex-col gap-2.5 px-6 pt-2 pb-6">
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-red-400/60 bg-red-600/30 px-[25px] text-[15px] font-semibold text-red-100 active:translate-y-px hover:bg-red-600/40"
              onClick={() => {
                clearLocalData()
                setDeveloperPreview(false)
                setHapticsEnabled(true)
                deleteDialogRef.current?.close()
              }}
            >
              {s.deleteDataConfirm}
            </button>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white/5 px-[25px] text-[15px] font-semibold text-ink hover:bg-white/10"
              onClick={() => deleteDialogRef.current?.close()}
            >
              {cancel}
            </button>
          </div>
        </dialog>
        <div className="mt-auto py-3 text-center text-xs leading-relaxed text-muted">
          <p title={m.buildHint}>{m.build(import.meta.env.VITE_GIT_COMMIT)}</p>
          <p>{m.madeBy}</p>
        </div>
      </MenuLayout>
    )
  },
})
