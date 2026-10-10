import { chooseBotActions } from '../src/lib/engine/bot.ts'
import { DEFAULT_BOT_CONFIG } from '../src/lib/engine/ai/decision.ts'
import { activePawn, type Action, type GameState } from '../src/lib/engine/index.ts'
import { initialPlayback, playbackReducer } from '../src/lib/playback.ts'
import type { BattleSetup, Transition } from '../src/lib/engine/index.ts'

type BotController = Parameters<typeof chooseBotActions>[1]

// Plays a single-player battle the way useGame does: the player's action, then every enemy
// turn the bot proposes, through the same playback reducer.
export function createBotGame(controller: BotController = DEFAULT_BOT_CONFIG) {
  const initialTransition = (seed: string, setup?: BattleSetup) =>
    initialPlayback(seed, 'ai', setup)
  const transition = async (state: GameState, action: Action): Promise<Transition> => {
    if (action.type !== 'restart' && activePawn(state)?.side === 'enemy')
      return { state, frames: [] }
    let playback = playbackReducer({ state, frames: [] }, action, 'ai')
    const frames = [...playback.frames]
    while (!playback.state.winner && activePawn(playback.state)?.side === 'enemy') {
      const actions = await chooseBotActions(playback.state, controller)
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

export const { initialState, transition } = createBotGame()
