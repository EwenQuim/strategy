import { activePawn, reducer, type Action, type GameState } from '../engine.ts'
import { canUseSpecial, movementDestinations } from '../combat.ts'

export type TurnPlan = { actions: Action[]; state: GameState }
const END_TURN: Action = { type: 'endTurn' }

export function positionKey(state: GameState): string {
  let position = `${state.active}|${state.round}|${state.winner}|${state.randomState}|${state.order.join(',')}`
  for (const center of state.hellfire) position += `|fire:${center.q}:${center.r}`
  for (const pawn of state.pawns)
    position += `|${pawn.id}:${pawn.q}:${pawn.r}:${pawn.hp}:${pawn.energy}:${pawn.protectingId}:${pawn.specialUsed}:${pawn.bonusEnergy}:${pawn.springSince}`
  for (const tile of state.tiles.values())
    if (tile.feature === 'rune') position += `|rune:${tile.q}:${tile.r}`
  return position
}

// Move, use one ability, then reposition. No attack permutations or dodge worlds.
export function turnPlans(state: GameState): TurnPlan[] {
  return [...generateTurnPlans(state)]
}

// Replies can stop generating successors as soon as alpha-beta proves a cutoff. Defer quiet
// turn endings when requested so abilities come first without settling every quiet reply.
export function* generateTurnPlans(
  state: GameState,
  abilitiesFirst = false,
): Generator<TurnPlan> {
  const id = activePawn(state)!.id
  const positions = new Set<string>()
  const quiet: TurnPlan[] = []
  const over = (current: GameState) => !!current.winner || activePawn(current)?.id !== id
  const keep = (
    current: GameState,
    actions: Action[],
    deferred = false,
  ): TurnPlan | undefined => {
    if (abilitiesFirst && !deferred && !actions.some((action) => action.type === 'special')) {
      quiet.push({ state: current, actions })
      return
    }
    const ended = over(current) ? current : reducer(current, END_TURN)
    const position = positionKey(ended)
    if (positions.has(position)) return
    positions.add(position)
    const plan = {
      state: ended,
      actions: ended === current ? actions : [...actions, END_TURN],
    }
    return plan
  }
  const moves = (current: GameState): Action[] => {
    const pawn = activePawn(current)!
    return [...movementDestinations(current.tiles, current.pawns, pawn)]
      .filter(([, cost]) => cost > 0)
      .map(([position]): Action => {
        const { q, r } = current.tiles.get(position)!
        return { type: 'move', q, r }
      })
  }
  function* afterAbility(current: GameState, actions: Action[]): Generator<TurnPlan> {
    const plan = keep(current, actions)
    if (plan) yield plan
    if (over(current)) return
    for (const move of moves(current)) {
      const moved = reducer(current, move)
      if (moved !== current) {
        const movedPlan = keep(moved, [...actions, move])
        if (movedPlan) yield movedPlan
      }
    }
  }
  function* act(current: GameState, actions: Action[]): Generator<TurnPlan> {
    const plan = keep(current, actions)
    if (plan) yield plan
    if (over(current)) return
    const pawn = activePawn(current)!
    if (!canUseSpecial(pawn)) return
    for (const ability of pawn.special.candidates(pawn, current)) {
      const next = reducer(current, ability)
      if (next !== current) yield* afterAbility(next, [...actions, ability])
    }
  }
  yield* act(state, [])
  for (const move of moves(state)) {
    const moved = reducer(state, move)
    if (moved !== state) yield* act(moved, [move])
  }
  for (const pending of quiet) {
    const plan = keep(pending.state, pending.actions, true)
    if (plan) yield plan
  }
}
