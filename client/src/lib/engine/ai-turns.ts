import { activePawn, reducer, type Action, type GameState } from './engine.ts'
import { canAttack, movementDestinations } from './combat.ts'
import { key, neighbors } from './hex.ts'
import type { Pawn } from './pawns/index.ts'

export type TurnPlan = { actions: Action[]; state: GameState }

const END_TURN: Action = { type: 'endTurn' }
const moveTo = (q: number, r: number): Action => ({ type: 'move', q, r })

function signature(state: GameState): string {
  return [
    state.active,
    state.winner,
    ...state.pawns.map((p) => [p.id, p.q, p.r, p.hp, p.energy, p.protectingId].join(':')),
  ].join('|')
}

// A turn moves or stays, uses its special before attacking while energy lasts, then ends by
// saving the remaining energy or, after acting, stepping back one hex. The most valuable target is
// struck first, so equal outcomes keep the order that matters most if a later blow is dodged.
export function turnPlans(state: GameState): TurnPlan[] {
  const id = activePawn(state)!.id
  const plans = new Map<string, TurnPlan>()
  const over = (current: GameState) => !!current.winner || activePawn(current)?.id !== id
  const apply = (current: GameState, actions: Action[]) => {
    const next = actions.reduce(reducer, current)
    return next === current ? null : next
  }
  const keep = (current: GameState, actions: Action[]) => {
    const [ended, plan] = over(current)
      ? [current, actions]
      : [apply(current, [END_TURN])!, [...actions, END_TURN]]
    const position = signature(ended)
    if (!plans.has(position)) plans.set(position, { actions: plan, state: ended })
  }
  const moves = (current: GameState) => {
    const pawn = activePawn(current)!
    return [...movementDestinations(current.tiles, current.pawns, pawn)]
      .filter(([, cost]) => cost > 0)
      .map(([position]) => current.tiles.get(position)!)
  }

  function act(current: GameState, actions: Action[], acted: boolean, attacked: boolean) {
    keep(current, actions)
    if (over(current)) return
    const pawn = activePawn(current)!
    if (acted)
      for (const step of moves(current).filter((tile) =>
        neighbors(pawn.q, pawn.r).some((n) => n.q === tile.q && n.r === tile.r),
      )) {
        const moved = apply(current, [moveTo(step.q, step.r)])
        if (moved) keep(moved, [...actions, moveTo(step.q, step.r)])
      }
    if (!attacked)
      for (const special of pawn.special.candidates(pawn, current)) {
        const next = apply(current, special)
        if (next) act(next, [...actions, ...special], true, false)
      }
    const here = current.tiles.get(key(pawn.q, pawn.r))
    const worth = (foe: Pawn) => foe.ai.value(foe, foe.hp)
    const targets = current.pawns.filter((p) => canAttack(pawn, p, here))
    for (const foe of targets.sort((a, b) => worth(b) - worth(a))) {
      const strike: Action[] = [
        { type: 'act', action: 'attack' },
        { type: 'attackAt', q: foe.q, r: foe.r },
      ]
      const next = apply(current, strike)
      if (next) act(next, [...actions, ...strike], true, true)
    }
  }

  act(state, [], false, false)
  for (const tile of moves(state)) {
    const moved = apply(state, [moveTo(tile.q, tile.r)])
    if (moved) act(moved, [moveTo(tile.q, tile.r)], false, false)
  }
  return [...plans.values()]
}
