import { buttonClassName } from '../components/styles'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ApiError, health, useOnlineGame } from '../api/online.ts'
import { Game } from '../components/Game'
import * as common from '../i18n/common'
import * as m from '../i18n/online'
import { readStoredGames } from '../onlineSession.ts'

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
    const stored = readStoredGames().find((game) => game.code === code)
    const game = useOnlineGame(code, !!stored)

    if (!stored) {
      return (
        <main className="grid min-h-dvh place-items-center bg-[#182c22] p-6 text-center">
          <div className="grid gap-4">
            <h1 className="font-serif text-[28px]">{m.notAPlayer}</h1>
            <p className="text-[12px] text-muted">{m.joinFromLobby}</p>
            <Link
              to="/online"
              className={
                buttonClassName +
                ' min-h-13 justify-center border-line bg-[#ffffff04] px-[25px] text-ink hover:bg-[#ffffff0c]'
              }
              preload={false}
            >
              {common.backToLobby}
            </Link>
          </div>
        </main>
      )
    }

    if (game.isError) {
      const status = game.error instanceof ApiError ? game.error.status : 0
      return (
        <main className="grid min-h-dvh place-items-center bg-[#182c22] p-6 text-center">
          <div className="grid gap-4">
            <h1 className="font-serif text-[28px]">
              {status === 404 ? m.gameGone : common.serverUnreachable}
            </h1>
            <Link
              to="/online"
              className={
                buttonClassName +
                ' min-h-13 justify-center border-line bg-[#ffffff04] px-[25px] text-ink hover:bg-[#ffffff0c]'
              }
              preload={false}
            >
              {common.backToLobby}
            </Link>
          </div>
        </main>
      )
    }

    const doc = game.data
    if (!doc || doc.status === 'waiting') {
      return (
        <main className="grid min-h-dvh place-items-center bg-[#182c22] px-5 py-8 text-center">
          <div className="grid w-full max-w-[340px] justify-items-center gap-5">
            <span className="text-[9px] font-semibold tracking-[0.17em] text-muted uppercase">
              {m.onlineGame}
            </span>
            <h1 className="font-serif text-[30px] leading-[normal]">{m.waitingTitle}</h1>
            {!doc ? (
              <p className="text-[12px] text-muted">{m.loading}</p>
            ) : (
              <>
                <p className="text-[12px] leading-[1.6] text-muted">
                  {m.shareCode(doc.namePlayer, doc.nameEnemy || undefined)}
                </p>
                <div
                  className="rounded-2xl border border-[#dcc48a59] bg-[#20362bee] px-8 py-5 font-mono text-[34px] tracking-[0.25em] text-gold"
                  data-testid="game-code"
                >
                  {code}
                </div>
                <button
                  type="button"
                  className={
                    buttonClassName +
                    ' min-h-11 justify-center border-line bg-[#ffffff04] px-4 text-[12px] hover:bg-[#ffffff0c]'
                  }
                  onClick={() => void navigator.clipboard?.writeText(code)}
                >
                  {m.copyCode}
                </button>
              </>
            )}
            <Link
              to="/online"
              className={
                buttonClassName +
                ' min-h-13 justify-center border-line bg-[#ffffff04] px-[25px] text-ink hover:bg-[#ffffff0c]'
              }
              preload={false}
            >
              {common.backToLobby}
            </Link>
          </div>
        </main>
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
