import { activePawn, reducer, type Action, type GameState } from '../engine.ts'
import { canAttack, movementDestinations } from '../combat.ts'
import { key, neighbors, passable } from '../hex.ts'
import type { Pawn } from '../pawns/index.ts'

export type TurnPlan = { actions: Action[]; state: GameState }

const END_TURN: Action = { type: 'endTurn' }
const FOLLOW_UP_TARGETS = 2
const PLANNED_ATTACKS = 3
const moveTo = (q: number, r: number): Action => ({ type: 'move', q, r })

export function positionKey(state: GameState): string {
  let key = `${state.active}|${state.round}|${state.winner}`
  for (const pawn of state.pawns)
    key += `|${pawn.id}:${pawn.q}:${pawn.r}:${pawn.hp}:${pawn.energy}:${pawn.escapeChance}:${pawn.protectingId}:${pawn.specialUsed}:${pawn.bonusEnergy}:${pawn.springSince}`
  return key
}

// A turn moves or stays, uses its special before attacking while energy lasts, then ends by
// saving the remaining energy or, after acting, stepping back one hex. The most valuable target is
// struck first, so equal outcomes keep the order that matters most if a later blow is dodged.
// Follow-up attacks keep hitting the previous target or one of the two most valuable, and a plan
// spells out at most three attacks: the unit decides again after each blow, so a rune-boosted unit
// with many targets still attacks with all its energy without exploding into thousands of plans.
export function turnPlans(state: GameState): TurnPlan[] {
  const id = activePawn(state)!.id
  const plans = new Map<string, TurnPlan>()
  const visited = new Set<string>()
  const over = (current: GameState) => !!current.winner || activePawn(current)?.id !== id
  const apply = (current: GameState, actions: Action[]) => {
    const next = actions.reduce(reducer, current)
    return next === current ? null : next
  }
  const keep = (current: GameState, actions: Action[], currentKey?: string) => {
    const [ended, plan] = over(current)
      ? [current, actions]
      : [apply(current, [END_TURN])!, [...actions, END_TURN]]
    const position =
      ended === current ? (currentKey ?? positionKey(current)) : positionKey(ended)
    if (!plans.has(position)) plans.set(position, { actions: plan, state: ended })
  }
  const moves = (current: GameState) => {
    const pawn = activePawn(current)!
    return [...movementDestinations(current.tiles, current.pawns, pawn)]
      .filter(([, cost]) => cost > 0)
      .map(([position]) => current.tiles.get(position)!)
  }
  const worth = (foe: Pawn) => foe.ai.value(foe, foe.hp)

  function act(
    current: GameState,
    actions: Action[],
    acted: boolean,
    attacks = 0,
    lastTarget?: number,
  ) {
    const currentKey = positionKey(current)
    const visit = [currentKey, acted, attacks, lastTarget].join('/')
    if (visited.has(visit)) return
    visited.add(visit)
    keep(current, actions, currentKey)
    if (over(current)) return
    const pawn = activePawn(current)!
    // Stepping back after acting only reaches the adjacent hexes, so scanning them directly
    // skips a full walking-range search per node. The tile order matches the search's.
    if (acted && pawn.energy >= pawn.moveCost)
      for (const step of neighbors(pawn.q, pawn.r)) {
        const tile = current.tiles.get(key(step.q, step.r))
        if (!tile || !passable(tile)) continue
        if (current.pawns.some((p) => p.id !== pawn.id && p.q === step.q && p.r === step.r))
          continue
        const moved = apply(current, [moveTo(step.q, step.r)])
        if (moved) keep(moved, [...actions, moveTo(step.q, step.r)])
      }
    if (lastTarget === undefined)
      for (const special of pawn.special.candidates(pawn, current)) {
        const next = apply(current, [special])
        if (next) act(next, [...actions, special], true, attacks)
      }
    const here = current.tiles.get(key(pawn.q, pawn.r))
    const targets = current.pawns
      .filter((p) => canAttack(pawn, p, here))
      .sort((a, b) => worth(b) - worth(a))
    const considered =
      attacks >= PLANNED_ATTACKS
        ? []
        : lastTarget === undefined
          ? targets
          : targets.filter((foe, index) => foe.id === lastTarget || index < FOLLOW_UP_TARGETS)
    for (const foe of considered) {
      const strike: Action = { type: 'attack', q: foe.q, r: foe.r }
      const next = apply(current, [strike])
      if (next) act(next, [...actions, strike], true, attacks + 1, foe.id)
    }
  }

  act(state, [], false)
  for (const tile of moves(state)) {
    const moved = apply(state, [moveTo(tile.q, tile.r)])
    if (moved) act(moved, [moveTo(tile.q, tile.r)], false)
  }
  return [...plans.values()]
}
