import { transition } from './bot.ts'
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
