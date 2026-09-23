import { buttonClassName, iconButtonClassName } from '../components/styles'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  getGetGameQueryOptions,
  useCreateGame,
  useJoinGame,
  type PublicGame,
} from '../../generated/sdk.gen.ts'
import { ApiError } from '../api/client.ts'
import { Icon } from '../components/Icon'
import {
  onlineEnabled,
  readPlayerName,
  readStoredGames,
  savePlayerName,
  saveStoredGame,
} from '../online.ts'
import type { StoredGame } from '../lib/online.ts'

const inputClassName =
  'w-full min-w-0 min-h-13 rounded-md border border-line bg-[#20362b] p-2 font-[inherit] text-[16px] text-ink [color-scheme:dark]'
const onlineButtonClassName = buttonClassName + ' min-h-13 justify-center border-line'

export const Route = createFileRoute('/online/')({
  beforeLoad: () => {
    if (!onlineEnabled()) throw redirect({ to: '/' })
  },
  component: function OnlineLobby() {
    const navigate = useNavigate()
    const [name, setName] = useState(readPlayerName())
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [games, setGames] = useState<StoredGame[]>([])
    const createGame = useCreateGame()
    const joinGame = useJoinGame()
    const busy = createGame.isPending || joinGame.isPending

    useEffect(() => {
      setGames(readStoredGames())
    }, [])

    const docs = useQueries({
      queries: games.map((game) => getGetGameQueryOptions(game.code)),
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
          status === 404
            ? 'No game with this code.'
            : status === 409
              ? 'This game already has two players.'
              : 'Could not reach the game server.',
        )
      }
    }

    return (
      <main className="m-auto flex h-dvh max-w-[520px] flex-col gap-4 pt-[max(12px,env(safe-area-inset-top))] pr-[max(16px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-1 [&_input:focus-visible]:outline-gold [&:disabled]:opacity-50">
        <header className="flex items-center justify-between gap-3">
          <h1 className="mt-1 font-serif text-[32px] leading-[normal]">Online play</h1>
          <Link to="/" className={iconButtonClassName} aria-label="Back to home">
            <Icon name="close" />
          </Link>
        </header>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!trimmedName || busy) return
            void start(async () => {
              const creds = await createGame.mutateAsync({ data: { name: trimmedName } })
              saveStoredGame({ code: creds.game.code, token: creds.token, side: 'player' })
              return creds.game.code
            })
          }}
        >
          <label htmlFor="online-name" className="grid gap-1.5 text-[12px] text-muted">
            Your name
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
            Create new game
            <Icon name="arrow" />
          </button>
        </form>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!trimmedName || joinCode.length !== 6 || busy) return
            void start(async () => {
              const creds = await joinGame.mutateAsync({
                data: { name: trimmedName },
                code: joinCode,
              })
              saveStoredGame({ code: creds.game.code, token: creds.token, side: 'enemy' })
              return creds.game.code
            })
          }}
        >
          <label htmlFor="online-code" className="grid gap-1.5 text-[12px] text-muted">
            Game code
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
            Join game
            <Icon name="hex" />
          </button>
        </form>
        {error && (
          <p role="alert" className="text-[12px] text-[#e0a586]">
            {error}
          </p>
        )}
        {games.length > 0 && (
          <section
            className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto"
            aria-label="Resume a game"
          >
            <h2 className="text-[12px] font-semibold tracking-[0.17em] text-muted uppercase">
              Your games
            </h2>
            {games.map((game, index) => {
              const doc: PublicGame | undefined = docs[index]?.data
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
                  <span className="text-[11px] text-muted">
                    {!doc
                      ? missing
                        ? 'Not found'
                        : 'Loading...'
                      : doc.status === 'waiting'
                        ? 'Waiting for opponent'
                        : doc.status === 'finished'
                          ? 'Finished'
                          : (doc.namePlayer ?? '?') + ' vs ' + (doc.nameEnemy ?? '?')}
                  </span>
                </Link>
              )
            })}
          </section>
        )}
        <p className="mt-auto text-[11px] leading-[1.5] text-muted">
          Online battles are turn by turn, no timer. Moves sync every two seconds, so you can
          close the tab and resume later.
        </p>
      </main>
    )
  },
})
