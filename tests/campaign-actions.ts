import { activePawn, hexDist, type Action, type GameState } from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/bot.ts'
import type { BotStrategy } from '../src/lib/strategies.ts'

const weakestTarget: BotStrategy = {
  chooseTarget: (attacker, targets) =>
    targets.toSorted((a, b) => a.hp - b.hp || hexDist(attacker, a) - hexDist(attacker, b))[0],
}

export function campaignActions(state: GameState): Action[] {
  const actions = chooseBotActions(state, weakestTarget)
  const pawn = activePawn(state)
  return (pawn?.kind === 'king' || pawn?.kind === 'magician') && actions[0]?.type === 'move'
    ? [{ type: 'endTurn' }]
    : actions
}
