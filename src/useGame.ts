import { useEffect, useEffectEvent, useState } from 'react'
import { initialPlayback, playbackReducer } from './lib/playback.ts'
import type { GameMode } from './lib/game-mode.ts'
import type { BattleSetup } from './lib/engine/types.ts'
import type { BotDifficulty } from './lib/bot.ts'

export interface GameOptions {
  seed: string
  mode: GameMode
  setup?: BattleSetup
  difficulty?: BotDifficulty
  onVictory?: () => void
}

export function useGame({ seed, mode, setup, difficulty = 'normal', onVictory }: GameOptions) {
  const [playback, setPlayback] = useState(() => initialPlayback(seed, mode, setup))
  const frame = playback.frames[0]
  const state = frame?.state ?? playback.state

  function dispatch(action: Parameters<typeof playbackReducer>[1]) {
    const next = playbackReducer(playback, action, mode, difficulty)
    setPlayback(next)
    if (state.winner !== 'player' && (next.frames[0]?.state ?? next.state).winner === 'player')
      onVictory?.()
  }

  const nextFrame = useEffectEvent(() => dispatch({ type: 'playbackNext' }))
  useEffect(() => {
    if (!frame) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      nextFrame,
      frame.effect?.impacts?.length ? 700 : reducedMotion ? 0 : frame.effect ? 460 : 180,
    )
    return () => window.clearTimeout(timer)
  }, [frame])

  return {
    state,
    effect: frame?.effect ?? null,
    effectId: playback.frames.length,
    playing: !!frame,
    dispatch,
  }
}
