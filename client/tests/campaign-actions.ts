import assert from 'node:assert/strict'
import type { CampaignLevel } from '../src/lib/campaign.ts'
import type { Action, GameState } from '../src/lib/engine/index.ts'
import { chooseBotActions, createBotGame, huntTheKing } from '../src/lib/engine/bot.ts'
import { BOT_LEVELS, type BotDifficulty } from '../src/lib/engine/ai.ts'

export function campaignActions(state: GameState, caution = 0.25): Action[] {
  // Press the attack in long endgames instead of testing two kings retreating forever.
  return chooseBotActions(
    state,
    state.round > 20 ? huntTheKing : { ...BOT_LEVELS.hard, caution },
  )
}

export function playToTheEnd(level: CampaignLevel, difficulty: BotDifficulty, caution: number) {
  const bot = createBotGame(difficulty)
  let state = bot.initialState(level.seed, level.setup)
  for (let step = 0; step < 300 && !state.winner; step++) {
    for (const action of campaignActions(state, caution)) {
      const result = bot.transition(state, action)
      assert.notEqual(result.state, state, 'Invalid action in level ' + level.id)
      state = result.state
    }
  }
  return state
}
