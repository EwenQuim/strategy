import { useRef, useState } from 'react'
import { Button } from './Button'
import { Icon, PawnIcon } from './Icon'
import { menuCardClassName, menuInputClassName, smallSwitchClassName } from './styles'
import { RECRUIT_CLASSES, type PawnKind } from '../lib/engine'
import { readPublicHosting, savePlayerName, savePublicHosting } from '../onlineSession'
import { readLocal, saveLocal } from '../storage'
import { unitNames } from '../i18n/units'
import { specialTexts } from '../i18n/specialTexts'
import * as common from '../i18n/common'
import * as online from '../i18n/online'
import * as m from '../i18n/onlineLobby'

const recruits = RECRUIT_CLASSES.map((Unit) => new Unit(0, 0, 0, 'player'))
const rosterKey = 'hexmate.online.roster'
const starter: PawnKind[] = ['swordsman', 'archer', 'magician', 'ninja', 'bulwark']

function readRoster(): PawnKind[] {
  return readLocal(rosterKey, starter, (raw) => {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return starter
    return [...new Set(parsed)]
      .filter((kind): kind is PawnKind => recruits.some((pawn) => pawn.kind === kind))
      .slice(0, 5)
  })
}

export function OnlinePlayPanel({
  name,
  onNameChange,
  busy,
  onCreate,
}: {
  name: string
  onNameChange: (name: string) => void
  busy: boolean
  onCreate: (publicGame: boolean, roster?: PawnKind[]) => void
}) {
  const [publicHosting, setPublicHosting] = useState(readPublicHosting)
  const [roster, setRoster] = useState(readRoster)
  const [storageFailed, setStorageFailed] = useState(false)
  const teamEditor = useRef<HTMLDetailsElement>(null)
  const toggleTeamEditor = () => {
    if (teamEditor.current) teamEditor.current.open = !teamEditor.current.open
  }

  return (
    <section className="grid w-full max-w-[600px] gap-3 self-center">
      <label htmlFor="online-name" className="flex items-center gap-3 text-sm text-muted">
        <span className="shrink-0">{online.yourName}</span>
        <input
          id="online-name"
          className={menuInputClassName}
          value={name}
          maxLength={20}
          autoComplete="nickname"
          required
          onChange={(event) => onNameChange(event.target.value)}
          onBlur={() => {
            if (name.trim()) savePlayerName(name.trim())
          }}
        />
      </label>
      <div className={menuCardClassName + ' grid gap-4 p-4 min-[900px]:p-5'}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{m.myTeam}</h2>
          <label
            htmlFor="online-private"
            className="flex cursor-pointer items-center gap-2 text-xs text-muted"
          >
            {m.privateGame}
            <input
              id="online-private"
              type="checkbox"
              role="switch"
              aria-describedby="online-private-hint"
              className={smallSwitchClassName}
              checked={!publicHosting}
              disabled={busy}
              onChange={(event) => {
                setPublicHosting(!event.target.checked)
                savePublicHosting(!event.target.checked)
              }}
            />
          </label>
          <span id="online-private-hint" className="sr-only">
            {publicHosting ? m.publicHint : m.privateHint}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted">{m.teamRules}</p>
        <ul className="grid grid-cols-5 gap-1.5" aria-label={m.myTeam}>
          {Array.from({ length: 5 }, (_, index) => {
            const kind = roster[index]
            return (
              <li key={index}>
                <button
                  type="button"
                  onClick={toggleTeamEditor}
                  className={
                    'flex w-full min-w-0 cursor-pointer flex-col items-center gap-2 rounded-xl border border-line bg-black/10 px-1 py-3 text-center ' +
                    (kind ? '' : 'border-dashed opacity-40')
                  }
                >
                  <span className={kind ? 'text-gold' : 'text-muted'}>
                    {kind ? <PawnIcon kind={kind} /> : <Icon name="hex" />}
                  </span>
                  <span
                    className="w-full truncate text-[10px]"
                    title={kind ? unitNames[kind] : undefined}
                  >
                    {kind ? unitNames[kind] : index + 1}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <details className="group" ref={teamEditor}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-gold [&::-webkit-details-marker]:hidden">
            {m.editTeam}
            <Icon name="arrow" className="size-4 group-open:rotate-90" />
          </summary>
          <p className="mb-3 text-xs leading-relaxed text-muted">{m.selectionHint}</p>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">{m.editTeam}</legend>
            {recruits.map((pawn) => {
              const selected = roster.includes(pawn.kind)
              return (
                <label key={pawn.kind} className="relative cursor-pointer">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={selected}
                    disabled={!selected && roster.length === 5}
                    onChange={() => {
                      const next = selected
                        ? roster.filter((kind) => kind !== pawn.kind)
                        : [...roster, pawn.kind]
                      setRoster(next)
                      setStorageFailed(!saveLocal(rosterKey, JSON.stringify(next)))
                      if (next.length === 5 && teamEditor.current) {
                        teamEditor.current.open = false
                      }
                    }}
                  />
                  <span className="flex h-full items-center gap-2 rounded-xl border border-line p-3 peer-checked:border-gold peer-checked:bg-gold/10 peer-focus-visible:outline-2 peer-focus-visible:outline-gold peer-disabled:opacity-45">
                    <span className="shrink-0 text-gold">
                      <PawnIcon kind={pawn.kind} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">
                        {unitNames[pawn.kind]}
                      </span>
                      <span className="block text-[10px] leading-snug text-muted">
                        {specialTexts[pawn.special.name]}
                      </span>
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>
        </details>
        {storageFailed && (
          <p role="alert" className="text-xs text-gold">
            {m.storageUnavailable}
          </p>
        )}
        <Button
          variant="primary"
          disabled={!name.trim() || roster.length !== 5 || busy}
          onClick={() => onCreate(publicHosting, roster)}
        >
          {busy ? online.loading : online.createGame}
          <Icon name="arrow" />
        </Button>
        <Button
          variant="ghost"
          size="compact"
          className="justify-center"
          disabled={!name.trim() || busy}
          title={m.quickDescription}
          onClick={() => onCreate(publicHosting)}
        >
          <Icon name="energy" />
          {common.quickPlay}
        </Button>
      </div>
    </section>
  )
}
