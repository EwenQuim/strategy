import {
  buttonClassName,
  menuCardClassName,
  menuPrimaryButtonClassName,
} from '../components/styles'
import { MenuLayout } from '../components/MenuLayout'
import { Icon } from '../components/Icon'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError, health, useJoinOnlineGame, useOnlineGame } from '../api/online.ts'
import { Game } from '../components/Game'
import * as common from '../i18n/common'
import * as m from '../i18n/online'
import { readPlayerNameOrDefault, readStoredGames, saveStoredGame } from '../onlineSession.ts'

const statusClassName =
  menuCardClassName +
  ' my-auto grid w-full max-w-[420px] justify-items-center gap-5 self-center p-6 text-center'

export const Route = createFileRoute('/online/$code')({
  beforeLoad: async ({ params }) => {
    if (!/^[A-Z0-9]{6}$/.test(params.code)) throw redirect({ to: '/online' })
    try {
      await health()
    } catch {
      throw redirect({ to: '/' })
    }
  },
  component: function OnlineBattle() {
    const { code } = Route.useParams()
    const [stored, setStored] = useState(() =>
      readStoredGames().find((game) => game.code === code),
    )
    const game = useOnlineGame(code, !!stored)
    const joinGame = useJoinOnlineGame()
    const [playerName] = useState(readPlayerNameOrDefault)
    const [error, setError] = useState('')

    if (game.isError) {
      const status = game.error instanceof ApiError ? game.error.status : 0
      return (
        <MenuLayout title={m.onlineGame} backTo="/online">
          <div className={statusClassName}>
            <Icon name="hex" className="size-10 text-gold" />
            <h2 className="text-2xl font-bold tracking-tight">
              {status === 404 ? m.gameGone : common.serverUnreachable}
            </h2>
          </div>
        </MenuLayout>
      )
    }

    if (!stored) {
      const doc = game.data
      return (
        <MenuLayout title={m.onlineGame} backTo="/online">
          <div className={statusClassName}>
            <span className="grid size-20 place-items-center rounded-3xl border border-gold/20 bg-[radial-gradient(circle,#dcc48a20,transparent)] text-gold">
              <Icon name="hex" className="size-10" />
            </span>
            <h2 className="text-2xl leading-tight font-bold tracking-tight">{m.joinTitle}</h2>
            {!doc ? (
              <p className="text-sm text-muted">{m.loading}</p>
            ) : doc.status === 'waiting' ? (
              <>
                <p className="text-sm leading-relaxed text-muted">
                  {m.hostedBy(doc.namePlayer)}
                </p>
                <p className="text-sm leading-relaxed text-muted">{m.joinAs(playerName)}</p>
                <button
                  type="button"
                  disabled={joinGame.isPending}
                  className={menuPrimaryButtonClassName + ' w-full'}
                  onClick={() => {
                    if (joinGame.isPending) return
                    void joinGame.mutateAsync(code, playerName).then(
                      (joined) => {
                        saveStoredGame(joined)
                        setStored(joined)
                      },
                      (cause) => {
                        const status = cause instanceof ApiError ? cause.status : 0
                        setError(
                          status === 404
                            ? m.gameGone
                            : status === 409
                              ? m.gameFull
                              : common.serverUnreachable,
                        )
                      },
                    )
                  }}
                >
                  {m.joinGame}
                  <Icon name="arrow" />
                </button>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                {doc.status === 'finished' ? m.finished : m.gameFull}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-[#e0a586]">
                {error}
              </p>
            )}
          </div>
        </MenuLayout>
      )
    }

    const doc = game.data
    if (!doc || doc.status === 'waiting') {
      return (
        <MenuLayout title={m.onlineGame} backTo="/online">
          <div className={statusClassName}>
            <span className="grid size-20 place-items-center rounded-3xl border border-gold/20 bg-[radial-gradient(circle,#dcc48a20,transparent)] text-gold">
              <Icon name="hex" className="size-10" />
            </span>
            <h2 className="text-2xl leading-tight font-bold tracking-tight">
              {m.waitingTitle}
            </h2>
            {!doc ? (
              <p className="text-sm text-muted">{m.loading}</p>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted">
                  {m.shareCode(doc.namePlayer, doc.nameEnemy || undefined)}
                </p>
                <div
                  className="w-full rounded-2xl border border-gold/25 bg-black/20 px-3 py-5 font-mono text-[30px] tracking-[0.2em] text-gold"
                  data-testid="game-code"
                >
                  {code}
                </div>
                {typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    className={menuPrimaryButtonClassName + ' w-full'}
                    onClick={() => {
                      navigator
                        .share({
                          title: 'Hexmate',
                          text: m.shareText(doc.namePlayer),
                          url: `${window.location.origin}/online/${code}`,
                        })
                        .catch(() => {})
                    }}
                  >
                    {m.shareInvite}
                    <Icon name="arrow" />
                  </button>
                )}
                <button
                  type="button"
                  className={
                    typeof navigator.share === 'function'
                      ? buttonClassName +
                        ' min-h-13 w-full justify-center gap-3 rounded-xl border-line px-[25px] bg-[#ffffff04] text-ink hover:bg-[#ffffff0c]'
                      : menuPrimaryButtonClassName + ' w-full'
                  }
                  onClick={() => void navigator.clipboard?.writeText(code)}
                >
                  {m.copyCode}
                </button>
              </>
            )}
          </div>
        </MenuLayout>
      )
    }

    return (
      <Game
        seed={doc.seed}
        mode="online"
        online={{ code, token: stored.token, side: stored.side }}
        players={{ player: doc.namePlayer, enemy: doc.nameEnemy }}
      />
    )
  },
})
