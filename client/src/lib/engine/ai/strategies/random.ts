import { activePawn, reducer, type Action, type GameState } from '../../engine.ts'
import { SeededRandom, seedState } from '../../random.ts'
import { legalActions } from '../options.ts'
import type { AiStrategy } from '../decision.ts'

// Plays the whole turn from one seeded stream: drawing each step from its own state would repeat
// the same pick whenever cancelling a target returns to an identical state. The battle's stream
// only moves on rolls, so the round and the unit keep quiet turns from all drawing alike.
function chooseRandomActions(state: GameState): Action[] {
  const id = activePawn(state)?.id
  const random = new SeededRandom(seedState(`${state.randomState}:${state.round}:${id}`))
  const actions: Action[] = []
  let current = state
  while (!current.winner && activePawn(current)?.id === id) {
    const options = legalActions(current)
    if (!options.length) break
    const action = options[Math.floor(random.next() * options.length)]
    actions.push(action)
    current = reducer(current, action)
  }
  return actions
}

export const random: AiStrategy = {
  id: 'random',
  chooseActions: chooseRandomActions,
}
