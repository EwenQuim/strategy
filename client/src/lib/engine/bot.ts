import {
  activePawn,
  initialState as createState,
  isImpactFrame,
  transition as applyAction,
  type Action,
  type BattleFrame,
  type GameState,
  type Transition,
} from './engine.ts'
import { canAttack, specialTargets } from './combat.ts'
import { chargeDestinations, jumpDestinations, type Pawn } from './pawns/index.ts'
import { distFrom, hexDist, key, neighbors, passable } from './hex.ts'
import type { BattleSetup } from './setup.ts'
import { BOT_LEVELS, type BotDifficulty, type BotOptions } from './ai.ts'
import { chooseAiActions, type AiStrategyId } from './ai/decision.ts'

export interface BotStrategy {
  chooseTarget(attacker: Pawn, targets: readonly Pawn[]): Pawn | undefined
}

export const nearestTarget: BotStrategy = {
  chooseTarget: (attacker, targets) =>
    targets.toSorted((a, b) => hexDist(attacker, a) - hexDist(attacker, b))[0],
}

export const huntTheKing: BotStrategy = {
  chooseTarget: (attacker, targets) =>
    nearestTarget.chooseTarget(
      attacker,
      targets.filter((p) => p.kind === 'king'),
    ) ?? nearestTarget.chooseTarget(attacker, targets),
}

type BotController = BotStrategy | BotDifficulty | BotOptions

const validBotOptions = (options: BotOptions | undefined): options is BotOptions =>
  !!options &&
  [2, 3].includes(options.depth) &&
  Number.isInteger(options.beamWidth) &&
  options.beamWidth >= 1 &&
  options.beamWidth <= 32 &&
  Number.isFinite(options.riskAppetite) &&
  options.riskAppetite >= -1 &&
  options.riskAppetite <= 1 &&
  ['best', 'nearest', 'weakest'].includes(options.focus) &&
  Number.isFinite(options.latitude) &&
  options.latitude >= 0 &&
  options.latitude <= 100

export function chooseBotActions(
  state: GameState,
  strategy: BotController = 'normal',
  aiStrategy: AiStrategyId = 'depthsearch',
): Action[] {
  if (typeof strategy === 'string' || !('chooseTarget' in strategy)) {
    const options = typeof strategy === 'string' ? BOT_LEVELS[strategy] : strategy
    if (!validBotOptions(options)) throw new RangeError('Invalid bot options')
    return chooseAiActions(state, options, aiStrategy)
  }
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  if (pawn.energy <= 0) return [{ type: 'endTurn' }]
  const foes = state.pawns.filter((p) => p.side !== pawn.side)
  const specials = specialTargets(state.pawns, pawn)
  return (
    ruleSpecial(state, pawn, foes, specials, strategy) ??
    ruleAttack(state, pawn, foes, strategy) ??
    ruleApproach(state, pawn, foes)
  )
}

function ruleSpecial(
  state: GameState,
  pawn: Pawn,
  foes: Pawn[],
  specials: Pawn[],
  strategy: BotStrategy,
): Action[] | null {
  const own = pawn.ai.ruleSpecial?.(pawn, state, foes, specials)
  if (own) return [own]
  if (pawn.special.areaTargets) {
    const area = pawn.special
      .candidates(pawn, state)
      .map((action) => {
        const aim = action.type === 'special' && action.target
        const targets = aim ? pawn.special.areaTargets!(state.pawns, aim, pawn) : []
        const score = targets.reduce(
          (total, target) => total + (target.side === pawn.side ? -1 : 1),
          0,
        )
        return { action, targets, score }
      })
      .filter(
        ({ targets, score }) =>
          score > 0 &&
          !targets.some(
            (target) => target.side === pawn.side && target.kind === 'king' && target.hp <= 1,
          ),
      )
      .sort((a, b) => b.score - a.score)[0]
    if (
      area &&
      (area.score > 1 ||
        !foes.some((foe) => canAttack(pawn, foe, state.tiles.get(key(pawn.q, pawn.r)))))
    )
      return [area.action]
  }
  const strikeTargets =
    pawn.special.targeted && !pawn.special.areaTargets && !pawn.special.choosesDestination
      ? specials.filter((p) => p.side !== pawn.side)
      : []
  const special = strategy.chooseTarget(pawn, strikeTargets)
  if (special) return [{ type: 'special', target: { q: special.q, r: special.r } }]
  return null
}

function ruleAttack(
  state: GameState,
  pawn: Pawn,
  foes: Pawn[],
  strategy: BotStrategy,
): Action[] | null {
  const target = strategy.chooseTarget(
    pawn,
    foes.filter((p) => canAttack(pawn, p, state.tiles.get(key(pawn.q, pawn.r)))),
  )
  if (target) return [{ type: 'attack', q: target.q, r: target.r }]

  const chargeTiles = [...chargeDestinations(state.tiles, state.pawns, pawn).keys()].map((k) =>
    state.tiles.get(k)!,
  )
  const chargeTarget = strategy.chooseTarget(
    pawn,
    foes.filter((p) => chargeTiles.some((tile) => canAttack(pawn, p, tile))),
  )
  if (!chargeTarget) return null
  const destination = chargeTiles.find((tile) => canAttack(pawn, chargeTarget, tile))!
  return [
    {
      type: 'special',
      target: { q: chargeTarget.q, r: chargeTarget.r },
      destination: { q: destination.q, r: destination.r },
    },
  ]
}

function ruleApproach(state: GameState, pawn: Pawn, foes: Pawn[]): Action[] {
  const occupied = new Set(
    state.pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)),
  )
  const firingTiles = [...state.tiles.values()].filter(
    (tile) =>
      passable(tile) &&
      !occupied.has(key(tile.q, tile.r)) &&
      foes.some((foe) => canAttack(pawn, foe, tile)),
  )
  const dist = distFrom(
    new Map([...state.tiles].filter(([position]) => !occupied.has(position))),
    firingTiles,
  )
  const here = dist.get(key(pawn.q, pawn.r)) ?? Infinity
  const step = neighbors(pawn.q, pawn.r)
    .filter(
      (n) =>
        !occupied.has(key(n.q, n.r)) &&
        (dist.get(key(n.q, n.r)) ?? Infinity) < here &&
        (pawn.hp > 1 || state.tiles.get(key(n.q, n.r))?.terrain !== 'lava'),
    )
    .sort((a, b) => dist.get(key(a.q, a.r))! - dist.get(key(b.q, b.r))!)[0]
  const jump = jumpDestinations(state.tiles, state.pawns, pawn)
    .filter((tile) => tile.terrain !== 'lava')
    .sort(
      (a, b) => (dist.get(key(a.q, a.r)) ?? Infinity) - (dist.get(key(b.q, b.r)) ?? Infinity),
    )[0]
  const jumpDistance = jump ? (dist.get(key(jump.q, jump.r)) ?? Infinity) : Infinity
  if (jump && jumpDistance < here && (!step || jumpDistance + pawn.special.cost < here)) {
    return [{ type: 'special', target: { q: jump.q, r: jump.r } }]
  }
  return step && pawn.energy >= pawn.moveCost
    ? [{ type: 'move', q: step.q, r: step.r }]
    : [{ type: 'endTurn' }]
}

export function createBotGame(
  strategy: BotController = 'normal',
  aiStrategy: AiStrategyId = 'depthsearch',
) {
  function playBots(state: GameState): Transition {
    const frames: BattleFrame[] = []
    while (!state.winner && activePawn(state)?.side === 'enemy') {
      const id = activePawn(state)!.id
      const round = state.round
      frames.push({ state: { ...state, order: [...state.order] }, effect: null })
      do {
        for (const action of chooseBotActions(state, strategy, aiStrategy)) {
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
    const state = createState(seed, setup, 'player')
    return { state, frames: [] }
  }
  const transition = (state: GameState, action: Action): Transition => {
    if (action.type === 'restart') return initialTransition(state.seed, state.setup)
    if (activePawn(state)?.side === 'enemy') return { state, frames: [] }
    const player = applyAction(state, action)
    const bots = playBots(player.state)
    return {
      state: bots.state,
      frames: [...player.frames.filter(isImpactFrame), ...bots.frames],
    }
  }
  return {
    initialState: (seed: string, setup?: BattleSetup) => initialTransition(seed, setup).state,
    reducer: (state: GameState, action: Action) => transition(state, action).state,
    initialTransition,
    transition,
  }
}

export const { initialState, initialTransition, transition } = createBotGame()
