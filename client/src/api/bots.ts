import { LOCAL_STRATEGIES, type AiStrategy } from '../lib/engine/ai/decision.ts'
import type { AiStrategyId } from '../lib/bot-config.ts'
import { jevChooseAction } from './jevBot.ts'
import { mistralChooseAction } from './mistralBot.ts'

// Every entry runs the named bot. Remote adapters handle their own local fallback.
export const STRATEGIES: Record<AiStrategyId, AiStrategy> = {
  ...LOCAL_STRATEGIES,
  mistral: async (state) => [await mistralChooseAction(state)],
  jev: async (state) => [await jevChooseAction(state)],
}
