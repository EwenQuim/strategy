import { useCallback, useEffect, useRef } from 'react'
import { usePlayAction } from '../../generated/sdk.gen.ts'
import { playbackReducer, type PlaybackAction } from '../lib/playback.ts'
import type { OnlineAction } from '../lib/online.ts'
import type { GameMode } from '../lib/game-mode.ts'
import type { BotDifficulty } from '../lib/engine/ai.ts'
import type { Transition } from '../lib/engine/index.ts'
import { fetchOnlineGame, useOnlineGame } from './online.ts'
import type { OnlineSession } from './useGame.ts'

export function useOnlineSync(
  online: OnlineSession | undefined,
  playback: Transition,
  mode: GameMode,
  difficulty: BotDifficulty,
  dispatch: (action: PlaybackAction) => void,
) {
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
  }, [dispatch, game.data, game.dataUpdatedAt, online])

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
  }, [dispatch, online])

  return useCallback(
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
    [difficulty, dispatch, mode, online, playback, playAction, resync],
  )
}
