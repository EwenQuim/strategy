import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  initialPlayback,
  playbackReducer,
  frameDelay,
  type PlaybackAction,
} from '../lib/playback.ts'
import { isRecordedAction, replayBattle } from '../lib/battleRecord.ts'
import {
  battleRecordKey,
  clearBattleActions,
  readBattleActions,
  saveBattleActions,
} from '../battleSession.ts'
import { useOnlineSync } from './onlineSync.ts'
import type { Side } from '../lib/engine/pawns/pawn.ts'
import type { GameMode } from '../lib/game-mode.ts'
import type { Action, BattleSetup, Transition } from '../lib/engine/index.ts'
import type { BotDifficulty } from '../lib/engine/ai.ts'

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
  const recordKey = battleRecordKey(mode, seed, difficulty)
  const [playback, dispatch] = useReducer(
    (playback: Transition, action: PlaybackAction) => {
      const next = playbackReducer(playback, action, mode, difficulty)
      // Saving before playback ends keeps a victory if the tab closes mid-animation; StrictMode's double call is harmless because saving is idempotent.
      if (next.state.winner === 'player' && playback.state.winner !== 'player') onVictory?.()
      return next
    },
    seed,
    (seed) => {
      // Online battles resync from the server snapshot instead of a local record.
      const actions = online ? null : readBattleActions(recordKey, setup)
      if (!actions?.length) return initialPlayback(seed, mode, setup)
      try {
        return replayBattle(seed, mode, setup, difficulty, actions)
      } catch {
        // A record saved by an older client may no longer replay: start over.
        return initialPlayback(seed, mode, setup)
      }
    },
  )
  const dispatchOnline = useOnlineSync(online, playback, mode, difficulty, dispatch)
  const frame = playback.frames[0]

  useEffect(() => {
    if (!frame) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => dispatch({ type: 'playbackNext' }),
      frameDelay(frame, reducedMotion),
    )
    return () => window.clearTimeout(timer)
  }, [frame])

  // The reducer drops actions while frames are still playing, so recording must
  // know whether the current action will be applied; the ref stays current
  // because user events only fire after the effect has run.
  const live = useRef(playback)
  useEffect(() => {
    live.current = playback
  })
  const recorded = useRef<Action[] | null>(null)

  const dispatchAction = useCallback(
    (action: PlaybackAction) => {
      if (online) return dispatchOnline(action)
      if (!isRecordedAction(action) || live.current.frames.length) return dispatch(action)
      if (action.type === 'restart') {
        recorded.current = []
        clearBattleActions(recordKey)
      } else {
        if (recorded.current === null)
          recorded.current = readBattleActions(recordKey, setup) ?? []
        recorded.current.push(action)
        saveBattleActions(recordKey, setup, recorded.current)
      }
      dispatch(action)
    },
    [dispatchOnline, online, recordKey, setup],
  )

  return {
    state: frame?.state ?? playback.state,
    effect: frame?.effect ?? null,
    effectId: playback.frames.length,
    playing: !!frame,
    dispatch: online ? dispatchOnline : dispatchAction,
  }
}
