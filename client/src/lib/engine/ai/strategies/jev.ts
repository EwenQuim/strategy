import { depthsearch } from './depthsearch.ts'
import type { AiStrategy } from '../decision.ts'

// The Jev strategy thinks through TypeSafe's decision model. The whole bot — key, option
// list, API call, answer mapping — lives in one file outside the pure engine: src/api/jevBot.ts.
// Synchronous callers (benchmarks, analysis, the in-engine bot) get the local search.
export const jev: AiStrategy = {
  id: 'jev',
  adapterDriven: true,
  chooseActions: (state, options) => depthsearch.chooseActions(state, options),
}
