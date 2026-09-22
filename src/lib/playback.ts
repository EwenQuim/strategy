import { initialTransition, transition } from './bot.ts'
import { initialState, transition as applyAction } from './engine/engine.ts'
import type { Action, Transition } from './engine/types.ts'
import type { GameMode } from './game-mode.ts'

export function initialPlayback(seed: string, mode: GameMode = 'ai'): Transition {
  return mode === 'local' ? { state: initialState(seed), frames: [] } : initialTransition(seed)
}

export function playbackReducer(
  playback: Transition,
  action: Action | { type: 'playbackNext' } | { type: 'playbackFinish' },
  mode: GameMode = 'ai',
): Transition {
  if (action.type === 'playbackFinish') return { ...playback, frames: [] }
  if (action.type === 'playbackNext') return { ...playback, frames: playback.frames.slice(1) }
  if (playback.frames.length) return playback
  if (mode === 'local') {
    const result = applyAction(playback.state, action)
    return { ...result, frames: result.frames.filter((frame) => frame.effect?.impacts?.length) }
  }
  return transition(playback.state, action)
}
