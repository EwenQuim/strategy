import assert from 'node:assert/strict'
import type { CampaignLevel } from '../src/lib/campaign.ts'
import type { Action, GameState } from '../src/lib/engine/index.ts'
import { chooseBotActions, createBotGame, huntTheKing } from '../src/lib/engine/bot.ts'
import { BOT_LEVELS, type BotDifficulty } from '../src/lib/engine/ai.ts'

export function campaignActions(state: GameState, caution = 0.25): Action[] {
  // Press the attack in long endgames instead of testing two kings retreating forever.
  return chooseBotActions(
    state,
    state.round > 20 ? huntTheKing : { ...BOT_LEVELS.hard, riskAppetite: 1 - caution },
  )
}

function playToTheEnd(level: CampaignLevel, difficulty: BotDifficulty, caution: number) {
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

export function winnableAgainst(level: CampaignLevel, difficulty: BotDifficulty) {
  // Some encounters need maximum caution for the scripted player to outlast the bot.
  for (const caution of [0.25, 0.7, 1, 1.5, 2]) {
    if (playToTheEnd(level, difficulty, caution).winner === 'player') return true
  }
  return false
}
