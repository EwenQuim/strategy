import type { Action, GameState } from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/engine/bot.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { huntTheKing } from '../src/lib/engine/bot.ts'

export function campaignActions(state: GameState, caution = 0.25): Action[] {
  // Press the attack in long endgames instead of testing two kings retreating forever.
  return chooseBotActions(
    state,
    state.round > 20 ? huntTheKing : { ...BOT_LEVELS.hard, caution },
  )
}
