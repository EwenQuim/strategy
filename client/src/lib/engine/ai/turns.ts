import { activePawn, reducer, type Action, type GameState } from '../engine.ts'
import { canUseSpecial, movementDestinations, abilityDamage } from '../combat.ts'
import { hexDist, key } from '../hex.ts'

export type TurnPlan = { actions: Action[]; state: GameState }
const END_TURN: Action = { type: 'endTurn' }

export function positionKey(state: GameState): string {
  let position = `${state.active}|${state.round}|${state.winner}|${state.randomState}|${state.order.join(',')}`
  for (const hazard of state.hazards) {
    position += `|${hazard.kind}`
    if (hazard.kind === 'hellfire')
      for (const center of hazard.centers) position += `|${hazard.kind}:${center.q}:${center.r}`
  }
  for (const pawn of state.pawns)
    position += `|${pawn.id}:${pawn.q}:${pawn.r}:${pawn.hp}:${pawn.energy}:${pawn.protectingId}:${pawn.specialUsed}:${pawn.bonusEnergy}:${pawn.springSince}`
  for (const tile of state.tiles.values())
    if (tile.feature === 'rune') position += `|rune:${tile.q}:${tile.r}`
  return position
}

// Move, use one ability, then reposition. Optional movement pruning is only for forecasts.
export function turnPlans(state: GameState, movementLimit?: number): TurnPlan[] {
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
    const destinations = movementDestinations(current.tiles, current.pawns, pawn)
    const actions = [...destinations]
      .filter(([, cost]) => cost > 0)
      .map(([position]): Action => {
        const { q, r } = current.tiles.get(position)!
        return { type: 'move', q, r }
      })
    if (movementLimit === undefined || actions.length <= movementLimit) return actions
    const foes = current.pawns.filter((p) => p.side !== pawn.side)
    const value = (action: Action) => {
      if (action.type !== 'move') return 0
      const tile = current.tiles.get(key(action.q, action.r))!
      const cost = destinations.get(key(action.q, action.r))!
      const damage = Math.max(
        0,
        ...foes.map((target) =>
          abilityDamage(pawn, {
            target,
            from: tile,
            movementCost: cost,
            tiles: current.tiles,
            pawns: current.pawns,
          }),
        ),
      )
      const distance = Math.min(...foes.map((foe) => hexDist(tile, foe)))
      return (
        damage * 20 -
        distance * 2 -
        Number(tile.terrain === 'lava') * 15 +
        Number(tile.feature === 'rune') * 10
      )
    }
    return actions.sort((a, b) => value(b) - value(a)).slice(0, movementLimit)
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
