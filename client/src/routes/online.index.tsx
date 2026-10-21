import { Button, ButtonLink } from '../components/Button'
import { menuCardClassName, menuInputClassName, switchClassName } from '../components/styles'
import { MenuLayout } from '../components/MenuLayout'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import * as common from '../i18n/common'
import * as m from '../i18n/online'
import {
  ApiError,
  health,
  joinOnlineGame,
  onlineGameQueryOptions,
  useCreateOnlineGame,
  useJoinOnlineGame,
  useListOnlineGames,
} from '../api/online.ts'
import { Icon } from '../components/Icon'
import {
  readPlayerNameOrDefault,
  readPublicHosting,
  readStoredGames,
  savePlayerName,
  savePublicHosting,
  saveStoredGame,
} from '../onlineSession.ts'
import type { StoredGame } from '../lib/online.ts'

type OnlineSearch = { join?: string; failed?: number }

function parseOnlineSearch(search: Record<string, unknown>): OnlineSearch {
  const result: OnlineSearch = {
    join: typeof search.join === 'string' ? search.join.toUpperCase() : undefined,
  }
  const failed = typeof search.failed === 'string' ? Number(search.failed) : search.failed
  if (typeof failed === 'number' && Number.isInteger(failed)) result.failed = failed
  return result
}

const inviteError = (status: number | undefined) =>
  status === undefined
    ? ''
    : status === 404
      ? m.noGame
      : status === 409
        ? m.gameFull
        : common.serverUnreachable

export const Route = createFileRoute('/online/')({
  validateSearch: parseOnlineSearch,
  beforeLoad: async ({ search }) => {
    try {
      await health()
    } catch {
      throw redirect({ to: '/' })
    }
    const code = search.join
    if (!code || search.failed !== undefined || !/^[A-Z0-9]{6}$/.test(code)) return
    if (readStoredGames().some((game) => game.code === code)) {
      throw redirect({ to: '/online/$code', params: { code } })
    }
    try {
      saveStoredGame(await joinOnlineGame(code, readPlayerNameOrDefault()))
    } catch (cause) {
      const status = cause instanceof ApiError ? cause.status : 0
      throw redirect({ to: '/online', search: { join: code, failed: status } })
    }
    throw redirect({ to: '/online/$code', params: { code } })
  },
  component: function OnlineLobby() {
    const navigate = useNavigate()
    const search = Route.useSearch()
    const [name, setName] = useState(readPlayerNameOrDefault)
    const [code, setCode] = useState(search.join ?? '')
    const [error, setError] = useState(() => inviteError(search.failed))
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
              className={switchClassName}
              checked={publicHosting}
              onChange={(event) => {
                setPublicHosting(event.target.checked)
                savePublicHosting(event.target.checked)
              }}
            />
          </label>
          <Button type="submit" disabled={!trimmedName || busy} variant="primary">
            {m.createGame}
            <Icon name="arrow" />
          </Button>
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
          <Button
            type="submit"
            disabled={!trimmedName || joinCode.length !== 6 || busy}
            variant="secondary"
          >
            {m.joinGame}
            <Icon name="hex" />
          </Button>
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
              <Button
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
                className="w-full"
              >
                <span className="flex-1 text-left font-mono tracking-[0.2em]">{open.code}</span>
                <span className="min-w-0 text-xs text-muted wrap-anywhere">
                  {m.hostedBy(open.namePlayer)}
                </span>
              </Button>
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
                  <ButtonLink
                    key={game.code}
                    to="/online/$code"
                    params={{ code: game.code }}
                    className="w-full"
                    preload={false}
                  >
                    <span className="flex-1 text-left font-mono tracking-[0.2em]">
                      {game.code}
                    </span>
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
                  </ButtonLink>
                )
              })}
          </section>
        )}
        <p className="mt-auto text-xs leading-[1.5] text-muted">{m.lobbyNote}</p>
      </MenuLayout>
    )
  },
})
