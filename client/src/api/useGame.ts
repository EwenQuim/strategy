import { useCallback, useEffect, useReducer, useRef } from 'react'
import { initialPlayback, playbackReducer, type PlaybackAction } from '../lib/playback.ts'
import { usePlayAction } from '../../generated/sdk.gen.ts'
import { fetchOnlineGame, useOnlineGame } from './online.ts'
import type { Side } from '../lib/engine/pawns/pawn.ts'
import type { GameMode } from '../lib/game-mode.ts'
import type { OnlineAction } from '../lib/online.ts'
import type { BattleSetup, Transition } from '../lib/engine/types.ts'
import { isImpactFrame, type BotDifficulty } from '../lib/bot.ts'

export type OnlineSession = { code: string; token: string; side: Side }

export interface GameOptions {
  seed: string
  mode: GameMode
  setup?: BattleSetup
  difficulty?: BotDifficulty
  onVictory?: () => void
  online?: OnlineSession
}

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
  const needsResync = useRef(false)

  const game = useOnlineGame(online?.code ?? '')
  const playAction = usePlayAction()

  useEffect(() => {
    if (!online) return
    const actions: OnlineAction[] | undefined = game.data?.actions
    if (!actions) return
    if (actions.length !== appliedActions.current || needsResync.current) {
      appliedActions.current = actions.length
      needsResync.current = false
      dispatch({ type: 'resync', actions })
    }
  }, [game.data, game.dataUpdatedAt, online])

  const resync = useCallback(async () => {
    if (!online) return
    needsResync.current = true
    try {
      const doc = await fetchOnlineGame(online.code)
      if (doc.actions.length < appliedActions.current) return
      appliedActions.current = doc.actions.length
      needsResync.current = false
      dispatch({ type: 'resync', actions: doc.actions })
    } catch {
      // A reconnect snapshot also repairs rejected optimistic moves at the same version.
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
          const res = await playAction.mutateAsync({
            code: online.code,
            data: {
              token: online.token,
              version: appliedActions.current,
              action,
              winner: winner ?? null,
            },
          })
          appliedActions.current = Math.max(appliedActions.current, res.version)
        } catch {
          await resync()
        }
      })()
    },
    [difficulty, mode, online, playback, playAction, resync],
  )

  useEffect(() => {
    if (!frame) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => dispatch({ type: 'playbackNext' }),
      isImpactFrame(frame) ? 700 : reducedMotion ? 0 : frame.effect ? 460 : 180,
    )
    return () => window.clearTimeout(timer)
  }, [frame])

  return {
    state: frame?.state ?? playback.state,
    effect: frame?.effect ?? null,
    effectId: playback.frames.length,
    playing: !!frame,
    dispatch: online ? dispatchOnline : dispatch,
  }
}
