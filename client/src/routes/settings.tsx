import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { MenuLayout } from '../components/MenuLayout'
import {
  dialogClassName,
  menuCardClassName,
  menuPrimaryButtonClassName,
  buttonClassName,
} from '../components/styles'
import * as m from '../i18n/menus'
import * as s from '../i18n/settings'
import { ApiKeyField } from '../components/ApiKeyField'
import {
  clearAllData,
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
    const deleteDialog = useRef<HTMLDialogElement>(null)
    const [dataDeleted, setDataDeleted] = useState(false)
    return (
      <MenuLayout title={m.settings}>
        <label
          className={
            menuCardClassName +
            ' flex cursor-pointer items-start gap-3 p-4 min-[900px]:gap-5 min-[900px]:p-6'
          }
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <strong className="text-base">{m.developerPreview}</strong>
            <small id="developer-preview-hint" className="text-sm leading-relaxed text-muted">
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
        <label
          className={
            menuCardClassName +
            ' flex cursor-pointer items-start gap-3 p-4 min-[900px]:gap-5 min-[900px]:p-6'
          }
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <strong className="text-base">{m.haptics}</strong>
            <small id="haptics-hint" className="text-sm leading-relaxed text-muted">
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
        <div className={menuCardClassName + ' flex flex-col gap-3 p-4 min-[900px]:p-6'}>
          <strong className="text-base">{s.deleteAllData}</strong>
          {dataDeleted ? (
            <p className="text-sm text-muted">{s.deleteAllDataDone}</p>
          ) : (
            <button
              type="button"
              className={
                buttonClassName +
                ' justify-center gap-2 border-red-400/50 bg-red-500/15 px-4 text-red-200 hover:bg-red-500/25 active:translate-y-px'
              }
              onClick={() => deleteDialog.current?.showModal()}
            >
              {s.deleteAllData}
            </button>
          )}
        </div>
        <dialog
          ref={deleteDialog}
          className={dialogClassName + ' w-[min(420px,calc(100vw-28px))] gap-4 p-6'}
          aria-labelledby="delete-data-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) deleteDialog.current?.close()
          }}
        >
          <h2 className="font-serif text-[26px] leading-tight" id="delete-data-title">
            {s.deleteAllData}
          </h2>
          <p className="text-[14px] leading-normal text-muted">{s.deleteAllDataWarning}</p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              className={
                menuPrimaryButtonClassName +
                ' w-full from-[#f3c4c4] to-[#d95c5c] text-[#2a1111]'
              }
              onClick={() => {
                clearAllData()
                setDeveloperPreview(readDeveloperPreview())
                setHapticsEnabled(readHapticsEnabled())
                setMistralKey('')
                setJevKey('')
                setDataDeleted(true)
                deleteDialog.current?.close()
              }}
            >
              {s.deleteAllDataConfirm}
            </button>
            <button
              type="button"
              className={
                buttonClassName +
                ' w-full justify-center border-line bg-transparent px-4 hover:bg-[#ffffff09] active:translate-y-px'
              }
              onClick={() => deleteDialog.current?.close()}
            >
              {s.deleteAllDataCancel}
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
