import { buttonClassName } from '../components/styles'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getGame, type PublicGame } from '../api/sdk.gen.ts'
import { Game } from '../components/Game'
import { onlineEnabled, readStoredGames } from '../online.ts'

const POLL_INTERVAL_MS = 2000

export const Route = createFileRoute('/online/$code')({
  beforeLoad: ({ params }) => {
    if (!onlineEnabled()) throw redirect({ to: '/' })
    if (!/^[A-Z0-9]{6}$/.test(params.code)) throw redirect({ to: '/online' })
  },
  component: function OnlineBattle() {
    const { code } = Route.useParams()
    const stored = readStoredGames().find((game) => game.code === code)
    const [doc, setDoc] = useState<PublicGame | null>(null)
    const [error, setError] = useState('')
    const waiting = useRef(true)

    useEffect(() => {
      let cancelled = false
      const poll = async () => {
        if (!waiting.current || cancelled) return
        try {
          const res = await getGame(code)
          if (cancelled) return
          if (res.status === 200) {
            setDoc(res.data)
            setError('')
            if (res.data.status !== 'waiting') waiting.current = false
          } else {
            setError('This game does not exist anymore.')
          }
        } catch {
          setError('Could not reach the game server.')
        }
      }
      void poll()
      const timer = window.setInterval(poll, POLL_INTERVAL_MS)
      return () => {
        cancelled = true
        window.clearInterval(timer)
      }
    }, [code])

    if (!stored) {
      return (
        <main className="grid min-h-dvh place-items-center bg-[#182c22] p-6 text-center">
          <div className="grid gap-4">
            <h1 className="font-serif text-[28px]">You are not a player in this game.</h1>
            <p className="text-[12px] text-muted">
              Join it from the lobby with the game code, then come back.
            </p>
            <Link
              to="/online"
              className={
                buttonClassName +
                ' min-h-13 justify-center border-line bg-[#ffffff04] px-[25px] text-ink hover:bg-[#ffffff0c]'
              }
              preload={false}
            >
              Back to the lobby
            </Link>
          </div>
        </main>
      )
    }

    if (error && !doc) {
      return (
        <main className="grid min-h-dvh place-items-center bg-[#182c22] p-6 text-center">
          <div className="grid gap-4">
            <h1 className="font-serif text-[28px]">{error}</h1>
            <Link
              to="/online"
              className={
                buttonClassName +
                ' min-h-13 justify-center border-line bg-[#ffffff04] px-[25px] text-ink hover:bg-[#ffffff0c]'
              }
              preload={false}
            >
              Back to the lobby
            </Link>
          </div>
        </main>
      )
    }

    if (!doc || doc.status === 'waiting') {
      return (
        <main className="grid min-h-dvh place-items-center bg-[#182c22] px-5 py-8 text-center">
          <div className="grid w-full max-w-[340px] justify-items-center gap-5">
            <span className="text-[9px] font-semibold tracking-[0.17em] text-muted uppercase">
              Online game
            </span>
            <h1 className="font-serif text-[30px] leading-[normal]">Waiting for an opponent</h1>
            {!doc ? (
              <p className="text-[12px] text-muted">Loading...</p>
            ) : (
              <>
                <p className="text-[12px] leading-[1.6] text-muted">
                  {doc.namePlayer}, share this code. The battle starts as soon as{' '}
                  {doc.nameEnemy ? doc.nameEnemy + ' has' : 'someone has'} joined.
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
                  Copy code
                </button>
                <p className="text-[10px] text-muted" role="status">
                  This page checks every two seconds.
                </p>
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
              Back to the lobby
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
