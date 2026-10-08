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
import { jevChooseAction } from './jevBot.ts'
import { mistralChooseAction } from './mistralBot.ts'
import { activePawn } from '../lib/engine/index.ts'
import type { Side } from '../lib/engine/pawns/pawn.ts'
import type { GameMode } from '../lib/game-mode.ts'
import type { Action, BattleSetup, Transition } from '../lib/engine/index.ts'
import { DEFAULT_BOT_CONFIG, type BotConfig } from '../lib/engine/ai/decision.ts'

// Adapter-driven strategies have no synchronous bot: their adapter thinks one enemy action
// at a time. Adding one is a new entry here plus an adapterDriven strategy file.
const ASYNC_BOTS: Partial<
  Record<BotConfig['name'], (state: Transition['state']) => Promise<Action>>
> = {
  mistral: mistralChooseAction,
  jev: jevChooseAction,
}

export type OnlineSession = { code: string; token: string; side: Side }

export interface GameOptions {
  seed: string
  mode: GameMode
  setup?: BattleSetup
  bot?: BotConfig
  onVictory?: () => void
  online?: OnlineSession
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
    (playback: Transition, action: PlaybackAction) => {
      const next = playbackReducer(playback, action, mode, bot)
      // Saving before playback ends keeps a victory if the tab closes mid-animation; StrictMode's double call is harmless because saving is idempotent.
      if (next.state.winner === 'player' && playback.state.winner !== 'player') onVictory?.()
      return next
    },
    seed,
    (seed) => {
      // Online battles resync from the server snapshot instead of the saved one.
      const saved = online ? null : readBattleFromLocalStorage(mode, seed, bot, setup)
      return saved ? { state: saved, frames: [] } : initialPlayback(seed, mode, setup)
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

  // Adapter-driven strategies have no synchronous bot: while the enemy is to act, this
  // effect asks the adapter for one action and plays it through the same reducer as human
  // actions.
  const asyncBot = ASYNC_BOTS[bot.name]
  useEffect(() => {
    if (mode !== 'ai' || !asyncBot || online || playing || state.winner) return
    if (activePawn(state)?.side !== 'enemy') return
    let cancelled = false
    void asyncBot(state)
      .then((action) => {
        if (!cancelled) dispatch(action)
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'endTurn' })
      })
    return () => {
      cancelled = true
    }
  }, [asyncBot, dispatch, mode, online, playing, state])

  return {
    state,
    effect: frame?.effect ?? null,
    effectId: playback.frames.length,
    playing,
    dispatch: online ? dispatchOnline : dispatch,
  }
}
