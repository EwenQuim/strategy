import { activePawn, reducer, type Action, type GameState } from '../../lib/engine/engine.ts'
import { SeededRandom, seedState } from '../../lib/engine/random.ts'
import { legalActions } from '../../lib/engine/ai/options.ts'
import type { Bot } from '../bot.ts'
import { readOptions } from '../options.ts'

// Plays the whole turn from one seeded stream: the battle's stream only moves on rolls, so seeding
// each step from its state would repeat the same draw after every move. The round and the unit
// keep quiet turns from all drawing alike.
export class RandomBot implements Bot<Record<string, never>> {
  readonly name = 'random'
  readonly options: Readonly<Record<string, never>>

  constructor(options: Partial<Record<string, never>> = {}) {
    this.options = readOptions({}, options)
  }

  async chooseActions(state: GameState): Promise<Action[]> {
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
}
