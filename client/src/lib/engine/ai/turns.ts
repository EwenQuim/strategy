import { activePawn, reducer, type Action, type GameState } from '../engine.ts'
import { canUseSpecial, movementDestinations } from '../combat.ts'

export type TurnPlan = { actions: Action[]; state: GameState }
const END_TURN: Action = { type: 'endTurn' }

export function positionKey(state: GameState): string {
  let position = `${state.active}|${state.round}|${state.winner}|${state.randomState}`
  for (const pawn of state.pawns)
    position += `|${pawn.id}:${pawn.q}:${pawn.r}:${pawn.hp}:${pawn.energy}:${pawn.protectingId}:${pawn.specialUsed}:${pawn.bonusEnergy}:${pawn.springSince}`
  for (const tile of state.tiles.values())
    if (tile.feature === 'rune') position += `|rune:${tile.q}:${tile.r}`
  return position
}

// Move, use one ability, then reposition. No attack permutations or dodge worlds.
export function turnPlans(state: GameState): TurnPlan[] {
  const id = activePawn(state)!.id
  const plans = new Map<string, TurnPlan>()
  const over = (current: GameState) => !!current.winner || activePawn(current)?.id !== id
  const keep = (current: GameState, actions: Action[]) => {
    const ended = over(current) ? current : reducer(current, END_TURN)
    const position = positionKey(ended)
    if (!plans.has(position))
      plans.set(position, {
        state: ended,
        actions: ended === current ? actions : [...actions, END_TURN],
      })
  }
  const moves = (current: GameState): Action[] => {
    const pawn = activePawn(current)!
    return [...movementDestinations(current.tiles, current.pawns, pawn)]
      .filter(([, cost]) => cost > 0)
      .map(([position]) => {
        const { q, r } = current.tiles.get(position)!
        return { type: 'move', q, r }
      })
  }
  const afterAbility = (current: GameState, actions: Action[]) => {
    keep(current, actions)
    if (over(current)) return
    for (const move of moves(current)) {
      const moved = reducer(current, move)
      if (moved !== current) keep(moved, [...actions, move])
    }
  }
  const act = (current: GameState, actions: Action[]) => {
    keep(current, actions)
    if (over(current)) return
    const pawn = activePawn(current)!
    if (!canUseSpecial(pawn)) return
    for (const ability of pawn.special.candidates(pawn, current)) {
      const next = reducer(current, ability)
      if (next !== current) afterAbility(next, [...actions, ability])
    }
  }
  act(state, [])
  for (const move of moves(state)) {
    const moved = reducer(state, move)
    if (moved !== state) act(moved, [move])
  }
  return [...plans.values()]
}
