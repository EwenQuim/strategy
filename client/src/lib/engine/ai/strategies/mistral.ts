import { depthsearch } from './depthsearch.ts'
import type { AiStrategy } from '../decision.ts'

// The Mistral strategy thinks through a large language model. The whole bot — prompt, API call,
// reply parsing, key handling — lives in one file outside the pure engine: src/api/mistralBot.ts.
// Synchronous callers (benchmarks, analysis, the in-engine bot) get the local search.
export const mistral: AiStrategy = {
  id: 'mistral',
  adapterDriven: true,
  chooseActions: (state, options) => depthsearch.chooseActions(state, options),
}
