import { Button, ButtonLink } from '../components/Button'
import { menuCardClassName, menuInputClassName } from '../components/styles'
import { OnlinePlayPanel } from '../components/OnlinePlayPanel'
import * as lobby from '../i18n/onlineLobby'
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
  readStoredGames,
  savePlayerName,
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
        <OnlinePlayPanel
          name={name}
          onNameChange={setName}
          busy={busy}
          onCreate={(publicGame) =>
            void start(async () => {
              const game = await createGame.mutateAsync(trimmedName, publicGame)
              saveStoredGame(game)
              return game.code
            })
          }
        />
        <details
          className={menuCardClassName + ' w-full max-w-[600px] self-center p-4'}
          open={!!search.join}
        >
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink">
            {lobby.joinWithCode}
          </summary>
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!trimmedName || !/^[A-Z0-9]{6}$/.test(joinCode) || busy) return
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
              disabled={!trimmedName || !/^[A-Z0-9]{6}$/.test(joinCode) || busy}
              variant="secondary"
            >
              {m.joinGame}
              <Icon name="hex" />
            </Button>
          </form>
        </details>
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
              <span className="ml-2 text-xs font-normal tracking-normal normal-case">
                {common.quickPlay}
              </span>
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
