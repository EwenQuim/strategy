import { useEffect, useReducer } from 'react'
import { initialTransition, transition } from './engine/engine.ts'
import type { Action, Transition } from './engine/types.ts'

export function playbackReducer(
  playback: Transition,
  action: Action | { type: 'playbackNext' } | { type: 'playbackFinish' },
): Transition {
  if (action.type === 'playbackFinish') return { ...playback, frames: [] }
  if (action.type === 'playbackNext') return { ...playback, frames: playback.frames.slice(1) }
  if (playback.frames.length) return playback
  return transition(playback.state, action)
}

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
