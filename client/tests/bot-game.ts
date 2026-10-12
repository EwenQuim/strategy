import type { Bot } from '../src/bots/bot.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { activePawn, type Action, type GameState } from '../src/lib/engine/index.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import type { BattleSetup, Transition } from '../src/lib/engine/index.ts'

// Plays a single-player battle the way useGame does: the player's action, then every enemy
// turn the bot proposes, through the same playback reducer.
export function createBotGame(bot: Bot = new DepthsearchBot(BOT_LEVELS.normal)) {
  const initialTransition = (seed: string, setup?: BattleSetup) =>
    initialPlayback(seed, 'ai', setup)
  const transition = async (state: GameState, action: Action): Promise<Transition> => {
    if (action.type !== 'restart' && activePawn(state)?.side === 'enemy')
      return { state, frames: [] }
    let playback = playbackReducer({ state, frames: [] }, action, 'ai')
    const frames = [...playback.frames]
    while (!playback.state.winner && activePawn(playback.state)?.side === 'enemy') {
      const actions = await bot.chooseActions(playback.state)
      playback = playbackReducer(
        { state: playback.state, frames: [] },
        { type: 'botActions', actions },
        'ai',
      )
      frames.push(...playback.frames)
    }
    return { state: playback.state, frames }
  }
  return {
    initialState: (seed: string, setup?: BattleSetup) => initialTransition(seed, setup).state,
    reducer: async (state: GameState, action: Action) =>
      (await transition(state, action)).state,
    initialTransition,
    transition,
  }
}
