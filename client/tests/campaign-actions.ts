import assert from 'node:assert/strict'
import type { CampaignLevel } from '../src/lib/campaign.ts'
import type { Action, GameState } from '../src/lib/engine/index.ts'
import { huntTheKing } from '../src/bots/targetPicker.ts'
import { RulesBot } from '../src/bots/strategies/rules.ts'
import { createBotGame } from './bot-game.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import type { Bot } from '../src/bots/bot.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'

export function campaignActions(state: GameState, caution = 0.25): Promise<Action[]> {
  // Press the attack in long endgames instead of testing two kings retreating forever.
  const bot =
    state.round > 20
      ? new RulesBot(huntTheKing)
      : new DepthsearchBot({ ...BOT_LEVELS.hard, riskAppetite: 1 - caution })
  return bot.chooseActions(state)
}

async function playToTheEnd(level: CampaignLevel, enemyBot: Bot, caution: number) {
  const bot = createBotGame(enemyBot)
  let state = bot.initialState(level.seed, level.setup)
  for (let step = 0; step < 300 && !state.winner; step++) {
    for (const action of await campaignActions(state, caution)) {
      const result = await bot.transition(state, action)
      assert.notEqual(result.state, state, 'Invalid action in level ' + level.id)
      state = result.state
    }
  }
  return state
}

export async function winnableAgainst(level: CampaignLevel, enemyBot: Bot) {
  // Some encounters need maximum caution for the scripted player to outlast the bot.
  for (const caution of [0.25, 0.7, 1, 1.5, 2]) {
    if ((await playToTheEnd(level, enemyBot, caution)).winner === 'player') return true
  }
  return false
}
