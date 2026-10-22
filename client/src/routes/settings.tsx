import { Button } from '../components/Button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { MenuLayout } from '../components/MenuLayout'
import { dialogClassName, menuCardClassName, switchClassName } from '../components/styles'
import { Icon } from '../components/Icon'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import * as s from '../i18n/settings'
import { cancel } from '../i18n/game'
import { TextField } from '../components/TextField'
import {
  readDeveloperPreview,
  saveDeveloperPreview,
  readHapticsEnabled,
  saveHapticsEnabled,
  readServerUrl,
  saveServerUrl,
  readTeamColor,
  saveTeamColor,
} from '../preferences'
import { TEAM_COLORS, teamColorUnlocked } from '../lib/cosmetics'
import { readUnlockedAchievements } from '../achievementProgress'
import { achievements as achievementTexts } from '../i18n/achievements'
import * as c from '../i18n/cosmetics'
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
    const [serverUrl, setServerUrl] = useState(readServerUrl)
    const [teamColor, setTeamColor] = useState(readTeamColor)
    const earned = readUnlockedAchievements()
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
        <section
          className={menuCardClassName + ' flex flex-col gap-3 p-4 min-[900px]:p-6'}
          aria-labelledby="army-color-title"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <strong className="text-base" id="army-color-title">
              {c.armyColor}
            </strong>
            <small className="text-sm leading-relaxed text-muted">{c.armyColorHint}</small>
          </span>
          <div className="flex flex-wrap gap-2.5" role="group" aria-label={c.armyColor}>
            {TEAM_COLORS.map((color) => {
              const unlocked = teamColorUnlocked(color, earned)
              const selected = color.id === teamColor.id
              return (
                <button
                  key={color.id}
                  type="button"
                  className={
                    'grid size-11 place-items-center rounded-full border-2 ' +
                    (selected ? 'border-gold' : 'border-line') +
                    (unlocked ? ' cursor-pointer' : ' cursor-not-allowed opacity-40 grayscale')
                  }
                  style={{
                    background: 'linear-gradient(' + color.body[0] + ', ' + color.body[1] + ')',
                  }}
                  disabled={!unlocked}
                  aria-pressed={selected}
                  aria-label={
                    color.unlock && !unlocked
                      ? c.lockedColor(
                          c.colorNames[color.id],
                          achievementTexts[color.unlock].title,
                        )
                      : c.colorNames[color.id]
                  }
                  onClick={() => {
                    setTeamColor(color)
                    saveTeamColor(color.id)
                  }}
                >
                  {!unlocked && <Icon name="lock" className="size-5 text-ink" />}
                </button>
              )
            })}
          </div>
        </section>
        {developerPreview && (
          <>
            <TextField
              label={s.mistralApiKey}
              hint={s.mistralApiKeyHint}
              type="password"
              value={mistralKey}
              onChange={(key) => {
                setMistralKey(key)
                saveMistralApiKey(key)
              }}
            />
            <TextField
              label={s.jevApiKey}
              hint={s.jevApiKeyHint}
              type="password"
              value={jevKey}
              onChange={(key) => {
                setJevKey(key)
                saveJevApiKey(key)
              }}
            />
            <TextField
              label={s.serverUrl}
              hint={s.serverUrlHint}
              value={serverUrl}
              onChange={(url) => {
                setServerUrl(url)
                saveServerUrl(url)
              }}
            />
          </>
        )}
        <button
          type="button"
          className={
            menuCardClassName +
            ' flex w-full flex-col gap-1.5 p-4 text-left min-[900px]:p-6 hover:[&>strong]:text-red-200'
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteDialogRef.current?.close()}
              aria-label={common.closeDialog}
            >
              <Icon name="close" />
            </Button>
          </div>
          <p className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 text-[14px] leading-normal text-muted">
            {s.deleteDataWarning}
          </p>
          <div className="flex shrink-0 flex-col gap-2.5 px-6 pt-2 pb-6">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                clearLocalData()
                setDeveloperPreview(false)
                setHapticsEnabled(true)
                setServerUrl('')
                setTeamColor(readTeamColor())
                deleteDialogRef.current?.close()
              }}
            >
              {s.deleteDataConfirm}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => deleteDialogRef.current?.close()}
            >
              {cancel}
            </Button>
          </div>
        </dialog>
        <div className="mt-auto py-3 text-center text-xs leading-relaxed text-muted">
          <p title={m.buildHint}>{m.build(import.meta.env.VITE_GIT_COMMIT)}</p>
          <p>{m.madeBy}</p>
          <p>
            <Link to="/privacy" preload={false} className="underline underline-offset-4">
              {s.privacyPolicy}
            </Link>
          </p>
        </div>
      </MenuLayout>
    )
  },
})
