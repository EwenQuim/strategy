import {
  activePawn,
  initialState as createState,
  transition as applyAction,
} from './engine/engine.ts'
import {
  canAttack,
  chargeDestinations,
  jumpDestinations,
  specialTargets,
  protectorFor,
} from './engine/combat.ts'
import { distFrom, hexDist, key, neighbors, passable } from './engine/hex.ts'
import type { Action, BattleFrame, BattleSetup, GameState, Transition } from './engine/types.ts'
import { type BotStrategy } from './strategies.ts'
import {
  BOT_LEVELS,
  chooseTacticalActions,
  type BotDifficulty,
  type BotOptions,
} from './engine/ai.ts'

export { BOT_LEVELS, type BotDifficulty, type BotOptions } from './engine/ai.ts'

type BotController = BotStrategy | BotDifficulty | BotOptions

export function chooseBotActions(
  state: GameState,
  strategy: BotController = 'normal',
): Action[] {
  if (typeof strategy === 'string' || !('chooseTarget' in strategy)) {
    const options = typeof strategy === 'string' ? BOT_LEVELS[strategy] : strategy
    if (
      !options ||
      ![1, 2, 3].includes(options.depth) ||
      !Number.isInteger(options.beamWidth) ||
      options.beamWidth < 1 ||
      options.beamWidth > 32 ||
      !Number.isInteger(options.samples) ||
      options.samples < 1 ||
      options.samples > 16 ||
      !Number.isFinite(options.caution) ||
      options.caution < 0 ||
      options.caution > 2
    ) {
      throw new RangeError('Invalid bot options')
    }
    return chooseTacticalActions(state, options)
  }
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  if (state.phase !== 'move') return [{ type: 'cancelTargeting' }]
  if (pawn.energy <= 0) return [{ type: 'endTurn' }]
  const { pawns, tiles } = state
  const foes = pawns.filter((p) => p.side !== pawn.side)
  const specials = specialTargets(pawns, pawn)
  if (pawn.kind === 'king' && specials.length) return [{ type: 'act', action: 'special' }]
  if (pawn.kind === 'bulwark') {
    const ally = specials
      .filter((p) => !protectorFor(pawns, p) && foes.some((foe) => canAttack(foe, p)))
      .sort((a, b) => Number(b.kind === 'king') - Number(a.kind === 'king') || a.hp - b.hp)[0]
    if (ally)
      return [
        { type: 'act', action: 'special' },
        { type: 'specialAt', q: ally.q, r: ally.r },
      ]
  }
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
  const dist = distFrom(
    new Map([...tiles].filter(([position]) => !occupied.has(position))),
    firingTiles,
  )
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
  return step && pawn.energy >= pawn.moveCost
    ? [{ type: 'move', q: step.q, r: step.r }]
    : [{ type: 'endTurn' }]
}

export function createBotGame(strategy: BotController = 'normal') {
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

  const initialTransition = (seed: string, setup?: BattleSetup): Transition => {
    const state = createState(seed, setup)
    const first = state.order.findIndex(
      (id) => state.pawns.find((p) => p.id === id)?.side === 'player',
    )
    state.order = [...state.order.slice(first), ...state.order.slice(0, first)]
    return { state, frames: [] }
  }
  const transition = (state: GameState, action: Action): Transition => {
    if (action.type === 'restart') return initialTransition(state.seed, state.setup)
    if (activePawn(state)?.side === 'enemy') return { state, frames: [] }
    const player = applyAction(state, action)
    const bots = playBots(player.state)
    return {
      state: bots.state,
      frames: [
        ...player.frames.filter((frame) => frame.effect?.impacts?.length),
        ...bots.frames,
      ],
    }
  }
  return {
    initialState: (seed: string, setup?: BattleSetup) => initialTransition(seed, setup).state,
    reducer: (state: GameState, action: Action) => transition(state, action).state,
    initialTransition,
    transition,
  }
}

export const { initialState, reducer, initialTransition, transition } = createBotGame()
