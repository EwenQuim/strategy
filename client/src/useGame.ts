import { useCallback, useEffect, useReducer, useRef } from 'react'
import { initialPlayback, playbackReducer, type PlaybackAction } from './lib/playback.ts'
import { getGame, playAction } from './api/sdk.gen.ts'
import type { Side } from './lib/engine/pawns/pawn.ts'
import type { GameMode } from './lib/game-mode.ts'
import type { OnlineAction } from './lib/online.ts'
import type { BattleSetup, Transition } from './lib/engine/types.ts'
import type { BotDifficulty } from './lib/bot.ts'

export type OnlineSession = { code: string; token: string; side: Side }

export interface GameOptions {
  seed: string
  mode: GameMode
  setup?: BattleSetup
  difficulty?: BotDifficulty
  onVictory?: () => void
  online?: OnlineSession
}

const POLL_INTERVAL_MS = 2000

export function useGame({
  seed,
  mode,
  setup,
  difficulty = 'normal',
  onVictory,
  online,
}: GameOptions) {
  const [playback, dispatch] = useReducer(
    (playback: Transition, action: PlaybackAction) => {
      const next = playbackReducer(playback, action, mode, difficulty)
      // Saving before playback ends keeps a victory if the tab closes mid-animation; StrictMode's double call is harmless because saving is idempotent.
      if (next.state.winner === 'player' && playback.state.winner !== 'player') onVictory?.()
      return next
    },
    seed,
    (seed) => initialPlayback(seed, mode, setup),
  )
  const frame = playback.frames[0]
  const appliedActions = useRef(0)

  const resync = useCallback(async () => {
    if (!online) return
    try {
      const res = await getGame(online.code)
      if (res.status !== 200) return
      const actions = (res.data.actions ?? []) as unknown as OnlineAction[]
      appliedActions.current = actions.length
      dispatch({ type: 'resync', actions })
    } catch {
      // server unreachable: keep local state, next poll retries
    }
  }, [online])

  const dispatchOnline = useCallback(
    (action: PlaybackAction) => {
      if (
        !online ||
        action.type === 'playbackNext' ||
        action.type === 'playbackFinish' ||
        action.type === 'resync'
      ) {
        dispatch(action)
        return
      }
      const winner = playbackReducer(playback, action, mode, difficulty).state.winner
      dispatch(action)
      void (async () => {
        try {
          const res = await playAction(online.code, {
            token: online.token,
            version: appliedActions.current,
            action,
            winner: winner ?? null,
          })
          if (res.status === 200) {
            appliedActions.current = res.data.version
          } else {
            await resync()
          }
        } catch {
          await resync()
        }
      })()
    },
    [difficulty, mode, online, playback, resync],
  )

  useEffect(() => {
    if (!frame) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => dispatch({ type: 'playbackNext' }),
      frame.effect?.impacts?.length ? 700 : reducedMotion ? 0 : frame.effect ? 460 : 180,
    )
    return () => window.clearTimeout(timer)
  }, [frame])

  useEffect(() => {
    if (!online || playback.state.winner) return
    let cancelled = false
    const poll = async () => {
      try {
        const res = await getGame(online.code)
        if (cancelled || res.status !== 200) return
        const actions = res.data.actions as unknown as OnlineAction[] | null
        if ((actions?.length ?? 0) !== appliedActions.current) {
          appliedActions.current = actions?.length ?? 0
          dispatch({ type: 'resync', actions: actions ?? [] })
        }
      } catch {
        // server unreachable: next poll retries
      }
    }
    const timer = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [online, playback.state.winner])

  return {
    state: frame?.state ?? playback.state,
    effect: frame?.effect ?? null,
    effectId: playback.frames.length,
    playing: !!frame,
    dispatch: online ? dispatchOnline : dispatch,
  }
}
