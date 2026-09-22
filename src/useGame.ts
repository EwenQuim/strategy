import { useEffect, useReducer } from 'react'
import { initialTransition } from './lib/bot.ts'
import { playbackReducer } from './lib/playback.ts'

export function useGame(seed: string) {
  const [playback, dispatch] = useReducer(playbackReducer, seed, initialTransition)
  const frame = playback.frames[0]

  useEffect(() => {
    if (!frame) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => dispatch({ type: reducedMotion ? 'playbackFinish' : 'playbackNext' }),
      reducedMotion ? 0 : frame.effect ? 460 : 180,
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
