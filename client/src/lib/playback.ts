import { initialTransition, createBotGame } from './engine/bot.ts'
import { DEFAULT_BOT_CONFIG, STRATEGIES, type BotConfig } from './engine/ai/decision.ts'
import { activePawn, isImpactFrame, type BattleFrame } from './engine/index.ts'
import { initialState, transition as applyAction } from './engine/engine.ts'
import type { Action, BattleSetup, Transition } from './engine/index.ts'
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
  bot: BotConfig = DEFAULT_BOT_CONFIG,
): Transition {
  if (action.type === 'playbackFinish') return { ...playback, frames: [] }
  if (action.type === 'playbackNext') return { ...playback, frames: playback.frames.slice(1) }
  if (action.type === 'resync')
    return { state: replay(playback.state.seed, action.actions), frames: [] }
  if (playback.frames.length) return playback
  if (mode === 'ai' && STRATEGIES[bot.name].adapterDriven) {
    const result = applyAction(playback.state, action)
    // Adapter-driven strategies are played action by action by their async adapter, so
    // enemy moves animate like a local player's; the player's own actions keep only their
    // impact frames, as in bot games.
    const enemy = activePawn(playback.state)?.side === 'enemy'
    return { ...result, frames: enemy ? result.frames : result.frames.filter(isImpactFrame) }
  }
  if (mode === 'local' || mode === 'online') {
    const result = applyAction(playback.state, action)
    return {
      ...result,
      frames: result.frames.filter(isImpactFrame),
    }
  }
  return createBotGame(bot).transition(playback.state, action)
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
