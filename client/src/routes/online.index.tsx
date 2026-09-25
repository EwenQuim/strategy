import { buttonClassName, iconButtonClassName } from '../components/styles'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as common from '../i18n/common'
import * as m from '../i18n/online'
import {
  ApiError,
  health,
  onlineGameQueryOptions,
  useCreateOnlineGame,
  useJoinOnlineGame,
} from '../api/online.ts'
import { Icon } from '../components/Icon'
import {
  readPlayerName,
  readStoredGames,
  savePlayerName,
  saveStoredGame,
} from '../onlineSession.ts'
import type { StoredGame } from '../lib/online.ts'

const inputClassName =
  'w-full min-w-0 min-h-13 rounded-md border border-line bg-[#20362b] p-2 font-[inherit] text-base text-ink [color-scheme:dark]'
const onlineButtonClassName = buttonClassName + ' min-h-13 justify-center border-line'

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
    const [games, setGames] = useState<StoredGame[]>([])
    const createGame = useCreateOnlineGame()
    const joinGame = useJoinOnlineGame()
    const busy = createGame.isPending || joinGame.isPending

    useEffect(() => {
      setGames(readStoredGames())
    }, [])

    const docs = useQueries({
      queries: games.map((game) => onlineGameQueryOptions(game.code)),
    })

    const trimmedName = name.trim()
    const joinCode = code.trim().toUpperCase()

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
      <main className="m-auto flex h-dvh max-w-[520px] flex-col gap-4 pt-[max(12px,env(safe-area-inset-top))] pr-[max(16px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-1 [&_input:focus-visible]:outline-gold [&:disabled]:opacity-50">
        <header className="flex items-center justify-between gap-3">
          <h1 className="mt-1 font-serif text-3xl leading-[normal]">{m.title}</h1>
          <Link to="/" className={iconButtonClassName} aria-label={common.backToHome}>
            <Icon name="close" />
          </Link>
        </header>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!trimmedName || busy) return
            void start(async () => {
              const game = await createGame.mutateAsync(trimmedName)
              saveStoredGame(game)
              return game.code
            })
          }}
        >
          <label htmlFor="online-name" className="grid gap-1.5 text-xs text-muted">
            {m.yourName}
            <input
              className={inputClassName}
              id="online-name"
              value={name}
              maxLength={20}
              autoComplete="nickname"
              required
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={!trimmedName || busy}
            className={
              onlineButtonClassName +
              ' gap-3 border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'
            }
          >
            {m.createGame}
            <Icon name="arrow" />
          </button>
        </form>
        <form
          className="grid gap-3"
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
          <label htmlFor="online-code" className="grid gap-1.5 text-xs text-muted">
            {m.gameCode}
            <input
              className={inputClassName + ' text-center font-mono tracking-[0.3em] uppercase'}
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
              ' gap-3 px-[25px] bg-[#ffffff04] text-ink hover:bg-[#ffffff0c]'
            }
          >
            {m.joinGame}
            <Icon name="hex" />
          </button>
        </form>
        {error && (
          <p role="alert" className="text-xs text-[#e0a586]">
            {error}
          </p>
        )}
        {games.length > 0 && (
          <section
            className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto"
            aria-label={m.resumeGame}
          >
            <h2 className="text-xs font-semibold tracking-[0.17em] text-muted uppercase">
              {m.yourGames}
            </h2>
            {games.map((game, index) => {
              const doc = docs[index]?.data
              const missing = docs[index]?.isError
              return (
                <Link
                  key={game.code}
                  to="/online/$code"
                  params={{ code: game.code }}
                  className={
                    onlineButtonClassName +
                    ' justify-between px-4 py-3 text-left bg-[#ffffff04] hover:bg-[#ffffff0c]'
                  }
                  preload={false}
                >
                  <span className="font-mono tracking-[0.2em]">{game.code}</span>
                  <span className="text-xs text-muted">
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
      </main>
    )
  },
})
