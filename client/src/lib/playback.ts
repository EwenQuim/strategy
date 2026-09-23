import { initialTransition, createBotGame, type BotDifficulty } from './bot.ts'
import { initialState, transition as applyAction } from './engine/engine.ts'
import type { Action, BattleSetup, Transition } from './engine/types.ts'
import type { GameMode } from './game-mode.ts'
import type { OnlineAction } from './online.ts'

export function initialPlayback(
  seed: string,
  mode: GameMode = 'ai',
  setup?: BattleSetup,
): Transition {
  if (mode === 'ai') return initialTransition(seed, setup)
  return { state: initialState(seed, setup), frames: [] }
}

export type PlaybackAction =
  | Action
  | { type: 'playbackNext' }
  | { type: 'playbackFinish' }
  | { type: 'resync'; actions: OnlineAction[] }

export function playbackReducer(
  playback: Transition,
  action: PlaybackAction,
  mode: GameMode = 'ai',
  difficulty: BotDifficulty = 'normal',
): Transition {
  if (action.type === 'playbackFinish') return { ...playback, frames: [] }
  if (action.type === 'playbackNext') return { ...playback, frames: playback.frames.slice(1) }
  if (action.type === 'resync')
    return { state: replay(playback.state.seed, action.actions), frames: [] }
  if (playback.frames.length) return playback
  if (mode === 'local' || mode === 'online') {
    const result = applyAction(playback.state, action)
    return { ...result, frames: result.frames.filter((frame) => frame.effect?.impacts?.length) }
  }
  return createBotGame(difficulty).transition(playback.state, action)
}

export function replay(seed: string, actions: OnlineAction[]) {
  let state = initialState(seed)
  for (const { action } of actions) state = applyAction(state, action).state
  return state
}
