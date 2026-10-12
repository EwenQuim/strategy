import { useEffect, useReducer } from 'react'
import {
  initialPlayback,
  playbackReducer,
  frameDelay,
  type PlaybackAction,
} from '../lib/playback.ts'
import { readBattleFromLocalStorage, saveBattleToLocalStorage } from '../battleStorage.ts'
import { hapticForFrame } from '../haptics.ts'
import { useOnlineSync } from './onlineSync.ts'
import { activePawn } from '../lib/engine/index.ts'
import type { Side } from '../lib/engine/pawns/pawn.ts'
import type { GameMode } from '../lib/game-mode.ts'
import type { BattleSetup, Transition } from '../lib/engine/index.ts'
import { getBot, DEFAULT_BOT_CONFIG, type BotConfig } from '../bots/catalog.ts'

export type OnlineSession = { code: string; token: string; side: Side }

export interface GameOptions {
  seed: string
  mode: GameMode
  setup?: BattleSetup
  bot?: BotConfig
  onVictory?: () => void
  online?: OnlineSession
}

function useEnemyBot(botKey: string) {
  // This wrapper has no hook calls or JSX for inference; compile its value-keyed cache explicitly.
  'use memo'
  return getBot(JSON.parse(botKey) as BotConfig)
}

export function useGame({
  seed,
  mode,
  setup,
  bot = DEFAULT_BOT_CONFIG,
  onVictory,
  online,
}: GameOptions) {
  const [playback, dispatch] = useReducer(
    (currentPlayback: Transition, action: PlaybackAction) => {
      const next = playbackReducer(currentPlayback, action, mode)
      // Saving before playback ends keeps a victory if the tab closes mid-animation; StrictMode's double call is harmless because saving is idempotent.
      if (next.state.winner === 'player' && currentPlayback.state.winner !== 'player')
        onVictory?.()
      return next
    },
    seed,
    (initialSeed) => {
      // Online battles resync from the server snapshot instead of the saved one.
      const saved = online ? null : readBattleFromLocalStorage(mode, initialSeed, bot, setup)
      return saved ? { state: saved, frames: [] } : initialPlayback(initialSeed, mode, setup)
    },
  )
  const dispatchOnline = useOnlineSync(online, playback, mode, dispatch)
  const frame = playback.frames[0]
  const state = frame?.state ?? playback.state
  const playing = !!frame

  // The current battle lives in one localStorage slot, overwritten on every state change.
  useEffect(() => {
    if (!online) saveBattleToLocalStorage(mode, seed, bot, setup, playback.state)
  }, [bot, mode, online, playback.state, seed, setup])

  useEffect(() => {
    if (!frame) return
    hapticForFrame(frame)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => dispatch({ type: 'playbackNext' }),
      frameDelay(frame, reducedMotion),
    )
    return () => window.clearTimeout(timer)
  }, [frame])

  // URL configs are normalized at the boundary; equal values keep this game's bot stable.
  const enemyBot = useEnemyBot(JSON.stringify(bot))
  useEffect(() => {
    if (mode !== 'ai' || online || playing || state.winner) return
    if (activePawn(state)?.side !== 'enemy') return
    let cancelled = false
    void enemyBot
      .chooseActions(state)
      .catch(() => [])
      .then((actions) => {
        if (!cancelled) dispatch({ type: 'botActions', actions })
      })
    return () => {
      cancelled = true
    }
  }, [dispatch, enemyBot, mode, online, playing, state])

  return {
    state,
    effect: frame?.effect ?? null,
    effectId: playback.frames.length,
    playing,
    dispatch: online ? dispatchOnline : dispatch,
  }
}
