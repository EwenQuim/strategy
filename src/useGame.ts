import { useEffect, useReducer } from 'react'
import { initialPlayback, playbackReducer } from './lib/playback.ts'
import type { GameMode } from './lib/game-mode.ts'
import type { Transition } from './lib/engine/types.ts'

export function useGame(seed: string, mode: GameMode) {
  const [playback, dispatch] = useReducer(
    (playback: Transition, action: Parameters<typeof playbackReducer>[1]) =>
      playbackReducer(playback, action, mode),
    seed,
    (seed) => initialPlayback(seed, mode),
  )
  const frame = playback.frames[0]

  useEffect(() => {
    if (!frame) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => dispatch({ type: 'playbackNext' }),
      frame.effect?.impacts?.length ? 700 : reducedMotion ? 0 : frame.effect ? 460 : 180,
    )
    return () => window.clearTimeout(timer)
  }, [frame])

  return {
    state: frame?.state ?? playback.state,
    effect: frame?.effect ?? null,
    effectId: playback.frames.length,
    playing: !!frame,
    dispatch,
  }
}
