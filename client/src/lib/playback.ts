import { initialTransition, createBotGame, type BotDifficulty } from './bot.ts'
import { initialState, transition as applyAction } from './engine/engine.ts'
import type { Action, BattleSetup, Transition } from './engine/types.ts'
import type { GameMode } from './game-mode.ts'

export function initialPlayback(
  seed: string,
  mode: GameMode = 'ai',
  setup?: BattleSetup,
): Transition {
  return mode === 'local'
    ? { state: initialState(seed, setup), frames: [] }
    : initialTransition(seed, setup)
}

export function playbackReducer(
  playback: Transition,
  action: Action | { type: 'playbackNext' } | { type: 'playbackFinish' },
  mode: GameMode = 'ai',
  difficulty: BotDifficulty = 'normal',
): Transition {
  if (action.type === 'playbackFinish') return { ...playback, frames: [] }
  if (action.type === 'playbackNext') return { ...playback, frames: playback.frames.slice(1) }
  if (playback.frames.length) return playback
  if (mode === 'local') {
    const result = applyAction(playback.state, action)
    return { ...result, frames: result.frames.filter((frame) => frame.effect?.impacts?.length) }
  }
  return createBotGame(difficulty).transition(playback.state, action)
}
