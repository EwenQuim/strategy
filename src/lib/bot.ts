import {
  activePawn,
  initialState as createState,
  reducer as reduce,
  transition as applyAction,
} from './engine/engine.ts'
import {
  canAttack,
  chargeDestinations,
  jumpDestinations,
  specialTargets,
} from './engine/combat.ts'
import { distFrom, hexDist, key, neighbors, passable } from './engine/hex.ts'
import type { Action, BattleFrame, GameState, Transition } from './engine/types.ts'
import { nearestTarget, type BotStrategy } from './strategies.ts'

export function chooseBotActions(
  state: GameState,
  strategy: BotStrategy = nearestTarget,
): Action[] {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  if (state.phase !== 'move') return [{ type: 'cancelTargeting' }]
  if (pawn.energy <= 0) return [{ type: 'endTurn' }]
  const { pawns, tiles } = state
  const foes = pawns.filter((p) => p.side !== pawn.side)
  const specials = specialTargets(pawns, pawn)
  if (pawn.kind === 'king' && specials.length) return [{ type: 'act', action: 'special' }]
  const special = strategy.chooseTarget(
    pawn,
    specials.filter((p) =>
      pawn.kind === 'archer'
        ? p.escapeChance > 0
        : pawn.kind === 'magician' && foes.filter((f) => hexDist(p, f) <= 1).length > 1,
    ),
  )
  if (special)
    return [
      { type: 'act', action: 'special' },
      { type: 'specialAt', q: special.q, r: special.r },
    ]

  const target = strategy.chooseTarget(
    pawn,
    foes.filter((p) => canAttack(pawn, p)),
  )
  if (target)
    return [
      { type: 'act', action: 'attack' },
      { type: 'attackAt', q: target.q, r: target.r },
    ]

  const chargeTiles = [...chargeDestinations(tiles, pawns, pawn).keys()].map((k) =>
    tiles.get(k)!,
  )
  const chargeTarget = strategy.chooseTarget(
    pawn,
    foes.filter((p) => chargeTiles.some((tile) => canAttack(pawn, p, tile))),
  )
  if (chargeTarget) {
    const destination = chargeTiles.find((tile) => canAttack(pawn, chargeTarget, tile))!
    return [
      { type: 'act', action: 'special' },
      { type: 'specialAt', q: destination.q, r: destination.r },
      { type: 'specialAt', q: chargeTarget.q, r: chargeTarget.r },
    ]
  }

  const occupied = new Set(pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)))
  const firingTiles = [...tiles.values()].filter(
    (tile) =>
      passable(tile) &&
      !occupied.has(key(tile.q, tile.r)) &&
      foes.some((foe) => canAttack(pawn, foe, tile)),
  )
  const dist = distFrom(tiles, firingTiles)
  const here = dist.get(key(pawn.q, pawn.r)) ?? Infinity
  const step = neighbors(pawn.q, pawn.r)
    .filter((n) => !occupied.has(key(n.q, n.r)) && (dist.get(key(n.q, n.r)) ?? Infinity) < here)
    .sort((a, b) => dist.get(key(a.q, a.r))! - dist.get(key(b.q, b.r))!)[0]
  const jump = jumpDestinations(tiles, pawns, pawn).sort(
    (a, b) => (dist.get(key(a.q, a.r)) ?? Infinity) - (dist.get(key(b.q, b.r)) ?? Infinity),
  )[0]
  const jumpDistance = jump ? (dist.get(key(jump.q, jump.r)) ?? Infinity) : Infinity
  if (jump && jumpDistance < here && (!step || jumpDistance + pawn.special.cost < here)) {
    return [
      { type: 'act', action: 'special' },
      { type: 'specialAt', q: jump.q, r: jump.r },
    ]
  }
  return step ? [{ type: 'move', q: step.q, r: step.r }] : [{ type: 'endTurn' }]
}

export function createBotGame(strategy: BotStrategy = nearestTarget) {
  function playBots(state: GameState): Transition {
    const frames: BattleFrame[] = []
    while (!state.winner && activePawn(state)?.side === 'enemy') {
      const id = activePawn(state)!.id
      const round = state.round
      frames.push({ state: { ...state, order: [...state.order] }, effect: null })
      do {
        for (const action of chooseBotActions(state, strategy)) {
          const result = applyAction(state, action)
          if (result.state === state) throw new Error('Bot selected an invalid action')
          state = result.state
          frames.push(...result.frames)
        }
      } while (!state.winner && state.round === round && activePawn(state)?.id === id)
    }
    return { state, frames }
  }

  const initialTransition = (seed: string) => playBots(createState(seed))
  const transition = (state: GameState, action: Action): Transition => {
    if (action.type === 'restart') return initialTransition(state.seed)
    if (activePawn(state)?.side === 'enemy') return { state, frames: [] }
    return playBots(reduce(state, action))
  }
  return {
    initialState: (seed: string) => initialTransition(seed).state,
    reducer: (state: GameState, action: Action) => transition(state, action).state,
    initialTransition,
    transition,
  }
}

export const { initialState, reducer, initialTransition, transition } = createBotGame()
