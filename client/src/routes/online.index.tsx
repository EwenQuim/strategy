import {
  buttonClassName,
  menuCardClassName,
  menuInputClassName,
  menuPrimaryButtonClassName,
} from '../components/styles'
import { MenuLayout } from '../components/MenuLayout'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import * as common from '../i18n/common'
import * as m from '../i18n/online'
import {
  ApiError,
  health,
  onlineGameQueryOptions,
  useCreateOnlineGame,
  useJoinOnlineGame,
  useListOnlineGames,
} from '../api/online.ts'
import { Icon } from '../components/Icon'
import {
  readPlayerName,
  readPublicHosting,
  readStoredGames,
  savePlayerName,
  savePublicHosting,
  saveStoredGame,
} from '../onlineSession.ts'
import type { StoredGame } from '../lib/online.ts'

const onlineButtonClassName =
  buttonClassName + ' min-h-13 justify-center gap-3 rounded-xl border-line'

export const Route = createFileRoute('/online/')({
  beforeLoad: async () => {
    try {
      await health()
    } catch {
      throw redirect({ to: '/' })
    }
  },
  component: function OnlineLobby() {
    const navigate = useNavigate()
    const [name, setName] = useState(readPlayerName())
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [games] = useState<StoredGame[]>(readStoredGames)
    const [publicHosting, setPublicHosting] = useState(readPublicHosting)
    const [showGames, setShowGames] = useState(false)
    const createGame = useCreateOnlineGame()
    const joinGame = useJoinOnlineGame()
    const listQuery = useListOnlineGames()
    const busy = createGame.isPending || joinGame.isPending

    const docs = useQueries({
      queries: games.map((game) => onlineGameQueryOptions(game.code)),
    })

    const trimmedName = name.trim()
    const joinCode = code.trim().toUpperCase()
    const openGames = (listQuery.data ?? []).filter(
      (open) => !games.some((mine) => mine.code === open.code),
    )

    const start = async (run: () => Promise<string>) => {
      setError('')
      savePlayerName(trimmedName)
      try {
        navigate({ to: '/online/$code', params: { code: await run() } })
      } catch (cause) {
        const status = cause instanceof ApiError ? cause.status : 0
        setError(
          status === 404 ? m.noGame : status === 409 ? m.gameFull : common.serverUnreachable,
        )
      }
    }

    return (
      <MenuLayout title={m.title}>
        <form
          className={
            menuCardClassName +
            ' grid w-full max-w-[600px] gap-3 self-center p-4 min-[900px]:gap-4 min-[900px]:p-6'
          }
          onSubmit={(event) => {
            event.preventDefault()
            if (!trimmedName || busy) return
            void start(async () => {
              const game = await createGame.mutateAsync(trimmedName, publicHosting)
              saveStoredGame(game)
              return game.code
            })
          }}
        >
          <label htmlFor="online-name" className="grid gap-1.5 text-sm text-muted">
            {m.yourName}
            <input
              className={menuInputClassName}
              id="online-name"
              value={name}
              maxLength={20}
              autoComplete="nickname"
              required
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label
            htmlFor="online-public"
            className="flex cursor-pointer items-center gap-3 pt-1"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <strong className="text-sm">{m.publicGame}</strong>
              <small id="online-public-hint" className="text-xs leading-relaxed text-muted">
                {m.publicGameHint}
              </small>
            </span>
            <input
              id="online-public"
              type="checkbox"
              role="switch"
              aria-describedby="online-public-hint"
              className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-surface-raised transition-colors after:absolute after:top-1 after:left-1 after:size-[18px] after:rounded-full after:bg-muted after:transition-transform checked:bg-gold checked:after:translate-x-5 checked:after:bg-switch-knob motion-reduce:transition-none motion-reduce:after:transition-none"
              checked={publicHosting}
              onChange={(event) => {
                setPublicHosting(event.target.checked)
                savePublicHosting(event.target.checked)
              }}
            />
          </label>
          <button
            type="submit"
            disabled={!trimmedName || busy}
            className={menuPrimaryButtonClassName}
          >
            {m.createGame}
            <Icon name="arrow" />
          </button>
        </form>
        <form
          className={
            menuCardClassName +
            ' grid w-full max-w-[600px] gap-3 self-center p-4 min-[900px]:gap-4 min-[900px]:p-6'
          }
          onSubmit={(event) => {
            event.preventDefault()
            if (!trimmedName || joinCode.length !== 6 || busy) return
            void start(async () => {
              const game = await joinGame.mutateAsync(joinCode, trimmedName)
              saveStoredGame(game)
              return game.code
            })
          }}
        >
          <label htmlFor="online-code" className="grid gap-1.5 text-sm text-muted">
            {m.gameCode}
            <input
              className={
                menuInputClassName + ' text-center font-mono tracking-[0.3em] uppercase'
              }
              id="online-code"
              value={code}
              placeholder="AB3F9K"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <button
            type="submit"
            disabled={!trimmedName || joinCode.length !== 6 || busy}
            className={
              onlineButtonClassName +
              ' gap-3 px-[25px] bg-control text-ink hover:bg-control-hover'
            }
          >
            {m.joinGame}
            <Icon name="hex" />
          </button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-[#e0a586]">
            {error}
          </p>
        )}
        {openGames.length > 0 && (
          <section
            className="grid w-full max-w-[600px] content-start gap-2 self-center"
            aria-label={m.availableGames}
          >
            <h2 className="text-sm font-semibold tracking-[0.17em] text-muted uppercase">
              {m.availableGames}
            </h2>
            {openGames.map((open) => (
              <button
                key={open.code}
                type="button"
                disabled={!trimmedName || busy}
                onClick={() =>
                  void start(async () => {
                    const game = await joinGame.mutateAsync(open.code, trimmedName)
                    saveStoredGame(game)
                    return game.code
                  })
                }
                className={
                  onlineButtonClassName +
                  ' justify-between px-4 py-3 text-left bg-control hover:bg-control-hover disabled:opacity-50'
                }
              >
                <span className="font-mono tracking-[0.2em]">{open.code}</span>
                <span className="min-w-0 text-xs text-muted wrap-anywhere">
                  {m.hostedBy(open.namePlayer)}
                </span>
              </button>
            ))}
          </section>
        )}
        {games.length > 0 && (
          <section
            className="grid w-full max-w-[600px] content-start gap-2 self-center"
            aria-label={m.resumeGame}
          >
            <button
              type="button"
              aria-expanded={showGames}
              onClick={() => setShowGames(!showGames)}
              className="flex w-full items-center justify-between text-sm font-semibold tracking-[0.17em] text-muted uppercase"
            >
              <span>
                {m.yourGames}
                <span className="ml-2 font-sans tracking-normal normal-case">
                  ({m.yourGamesCount(games.length)})
                </span>
              </span>
              <Icon
                name="arrow"
                className={'size-4 transition-transform ' + (showGames ? 'rotate-90' : '')}
              />
            </button>
            {showGames &&
              games.map((game, index) => {
                const doc = docs[index]?.data
                const missing = docs[index]?.isError
                return (
                  <Link
                    key={game.code}
                    to="/online/$code"
                    params={{ code: game.code }}
                    className={
                      onlineButtonClassName +
                      ' justify-between px-4 py-3 text-left bg-control hover:bg-control-hover'
                    }
                    preload={false}
                  >
                    <span className="font-mono tracking-[0.2em]">{game.code}</span>
                    <span className="min-w-0 text-xs text-muted wrap-anywhere">
                      {!doc
                        ? missing
                          ? m.notFound
                          : m.loading
                        : doc.status === 'waiting'
                          ? m.waitingForOpponent
                          : doc.status === 'finished'
                            ? m.finished
                            : m.versus(doc.namePlayer, doc.nameEnemy)}
                    </span>
                  </Link>
                )
              })}
          </section>
        )}
        <p className="mt-auto text-xs leading-[1.5] text-muted">{m.lobbyNote}</p>
      </MenuLayout>
    )
  },
})
