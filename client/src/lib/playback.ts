import { activePawn, isImpactFrame, type BattleFrame } from './engine/index.ts'
import { initialState, transition as applyAction } from './engine/engine.ts'
import type { Action, BattleSetup, GameState, Transition } from './engine/index.ts'
import type { GameMode } from './game-mode.ts'
import type { OnlineAction } from './online.ts'

export function initialPlayback(
  seed: string,
  mode: GameMode = 'ai',
  setup?: BattleSetup,
): Transition {
  return { state: initialState(seed, setup, mode === 'ai' ? 'player' : undefined), frames: [] }
}

export type PlaybackAction =
  | Action
  | { type: 'botActions'; actions: Action[] }
  | { type: 'playbackNext' }
  | { type: 'playbackFinish' }
  | { type: 'resync'; actions: OnlineAction[] }

export function playbackReducer(
  playback: Transition,
  action: PlaybackAction,
  mode: GameMode = 'ai',
): Transition {
  if (action.type === 'playbackFinish') return { ...playback, frames: [] }
  if (action.type === 'playbackNext') return { ...playback, frames: playback.frames.slice(1) }
  if (action.type === 'resync')
    return { state: replay(playback.state.seed, action.actions), frames: [] }
  if (playback.frames.length) return playback
  if (action.type === 'restart')
    return initialPlayback(playback.state.seed, mode, playback.state.setup)
  if (action.type === 'botActions') return playBotActions(playback.state, action.actions)
  if (mode === 'ai' && activePawn(playback.state)?.side === 'enemy') return playback
  const result = applyAction(playback.state, action)
  return { ...result, frames: result.frames.filter(isImpactFrame) }
}

// A bot's whole proposal plays as one animated transition, opening on the unit it moves; a
// proposal the engine rejects ends the turn so the battle can never stall.
function playBotActions(state: GameState, actions: Action[]): Transition {
  const frames: BattleFrame[] = [{ state: { ...state, order: [...state.order] }, effect: null }]
  let current = state
  for (const action of actions) {
    const result = applyAction(current, action)
    current = result.state
    frames.push(...result.frames)
  }
  return current === state
    ? applyAction(state, { type: 'endTurn' })
    : { state: current, frames }
}

export function replay(seed: string, actions: OnlineAction[]) {
  let state = initialState(seed)
  for (const { action } of actions) state = applyAction(state, action).state
  return state
}

export function frameDelay(frame: BattleFrame, reducedMotion: boolean): number {
  if (isImpactFrame(frame)) return 700
  return reducedMotion ? 0 : frame.effect ? 460 : 180
}
