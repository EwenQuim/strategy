import { menuCardClassName, menuPrimaryButtonClassName } from '../components/styles'
import { MenuLayout } from '../components/MenuLayout'
import { Icon } from '../components/Icon'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { ApiError, health, useOnlineGame } from '../api/online.ts'
import { Game } from '../components/Game'
import * as common from '../i18n/common'
import * as m from '../i18n/online'
import { readStoredGames } from '../onlineSession.ts'

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
    const stored = readStoredGames().find((game) => game.code === code)
    const game = useOnlineGame(code, !!stored)

    if (!stored) {
      return (
        <MenuLayout title={m.onlineGame} backTo="/online">
          <div className={statusClassName}>
            <Icon name="lock" className="size-10 text-gold" />
            <h2 className="text-2xl font-bold tracking-tight">{m.notAPlayer}</h2>
            <p className="text-sm leading-relaxed text-muted">{m.joinFromLobby}</p>
          </div>
        </MenuLayout>
      )
    }

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
                <button
                  type="button"
                  className={menuPrimaryButtonClassName + ' w-full'}
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
