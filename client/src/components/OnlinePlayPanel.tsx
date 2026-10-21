import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from './Button'
import { Icon, PawnIcon } from './Icon'
import { menuCardClassName, menuInputClassName, switchClassName } from './styles'
import { BIOMES, RECRUIT_CLASSES, randomArmy, type Biome, type PawnKind } from '../lib/engine'
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
  onCreate: (publicGame: boolean) => void
}) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'quick' | 'team'>('quick')
  const [publicHosting, setPublicHosting] = useState(readPublicHosting)
  const [roster, setRoster] = useState(readRoster)
  const [storageFailed, setStorageFailed] = useState(false)

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
      <fieldset className="grid grid-cols-2 gap-2" disabled={busy}>
        <legend className="sr-only">{m.chooseMode}</legend>
        {(['quick', 'team'] as const).map((value) => (
          <label key={value} className="relative cursor-pointer">
            <input
              type="radio"
              name="online-mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
              className="peer sr-only"
            />
            <span className="flex h-full flex-col gap-1 rounded-xl border border-line bg-white/3 p-3 peer-checked:border-gold peer-checked:bg-gold/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold peer-disabled:opacity-55 min-[900px]:p-4">
              <span className="mb-1 text-gold">
                <Icon name={value === 'quick' ? 'spark' : 'shield'} />
              </span>
              <strong className="text-sm">
                {value === 'quick' ? common.quickPlay : m.myTeam}
              </strong>
              <span className="text-xs text-muted">
                {value === 'quick' ? m.quickHint : m.teamHint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={menuCardClassName + ' grid gap-4 p-4 min-[900px]:p-5'}>
        {mode === 'quick' ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (name.trim() && !busy) onCreate(publicHosting)
            }}
          >
            <p className="text-sm leading-relaxed text-muted">{m.quickDescription}</p>
            <Button type="submit" disabled={!name.trim() || busy} variant="primary">
              {busy ? online.loading : online.createGame}
              <Icon name="arrow" />
            </Button>
            <label htmlFor="online-public" className="flex cursor-pointer items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <strong className="text-sm">{online.publicGame}</strong>
                <small id="online-public-hint" className="text-xs leading-relaxed text-muted">
                  {publicHosting ? m.publicHint : m.privateHint}
                </small>
              </span>
              <input
                id="online-public"
                type="checkbox"
                role="switch"
                aria-describedby="online-public-hint"
                className={switchClassName}
                checked={publicHosting}
                disabled={busy}
                onChange={(event) => {
                  setPublicHosting(event.target.checked)
                  savePublicHosting(event.target.checked)
                }}
              />
            </label>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{m.myTeam}</h2>
              <span className="rounded-full border border-gold/30 px-2 py-1 text-xs text-gold">
                {m.prototype}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted">{m.teamRules}</p>
            <ul className="grid grid-cols-5 gap-1.5" aria-label={m.myTeam}>
              {Array.from({ length: 5 }, (_, index) => {
                const kind = roster[index]
                return (
                  <li
                    key={index}
                    className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-line bg-black/10 px-1 py-3 text-center"
                  >
                    <span className="text-gold">
                      {kind ? <PawnIcon kind={kind} /> : <Icon name="hex" />}
                    </span>
                    <span
                      className="w-full truncate text-[10px]"
                      title={kind ? unitNames[kind] : undefined}
                    >
                      {kind ? unitNames[kind] : index + 1}
                    </span>
                  </li>
                )
              })}
            </ul>
            <details className="group">
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
            <p role="status" className="text-xs text-muted">
              {m.selectionCount(roster.length)}
            </p>
            {storageFailed && (
              <p role="alert" className="text-xs text-gold">
                {m.storageUnavailable}
              </p>
            )}
            <p className="text-xs leading-relaxed text-muted">{m.prototypeHint}</p>
            <Button
              variant="primary"
              disabled={roster.length !== 5 || busy}
              onClick={() => {
                const biomes = (Object.keys(BIOMES) as Biome[]).filter(
                  (biome) => biome !== 'hell',
                )
                void navigate({
                  to: '/game',
                  search: {
                    mode: 'ai',
                    setup: {
                      biome: biomes[Math.floor(Math.random() * biomes.length)]!,
                      player: ['king', ...roster],
                      enemy: randomArmy({ next: Math.random }).map(
                        (Unit) => new Unit(0, 0, 0, 'enemy').kind,
                      ),
                    },
                  },
                })
              }}
            >
              {m.tryTeam}
              <Icon name="arrow" />
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
