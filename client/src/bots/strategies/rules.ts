import { activePawn, type Action, type GameState } from '../../lib/engine/engine.ts'
import { canAttack, specialTargets } from '../../lib/engine/combat.ts'
import {
  chargeDestinations,
  jumpDestinations,
  type Pawn,
} from '../../lib/engine/pawns/index.ts'
import { distFrom, key, neighbors, passable } from '../../lib/engine/hex.ts'
import type { Bot } from '../bot.ts'
import type { TargetPicker } from '../targetPicker.ts'

// A scripted bot around a target picker, for tests and campaign checks.
export class RulesBot implements Bot {
  readonly name = 'rules'
  readonly options = Object.freeze({})
  readonly picker: TargetPicker

  constructor(picker: TargetPicker) {
    this.picker = picker
  }

  async chooseActions(state: GameState): Promise<Action[]> {
    const pawn = activePawn(state)
    if (!pawn || state.winner) return []
    if (pawn.energy <= 0) return [{ type: 'endTurn' }]
    const foes = state.pawns.filter((p) => p.side !== pawn.side)
    const specials = specialTargets(state.pawns, pawn)
    return (
      ruleSpecial(state, pawn, foes, specials, this.picker) ??
      ruleAttack(state, pawn, foes, this.picker) ??
      ruleApproach(state, pawn, foes)
    )
  }
}

function ruleSpecial(
  state: GameState,
  pawn: Pawn,
  foes: Pawn[],
  specials: Pawn[],
  strategy: TargetPicker,
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
  strategy: TargetPicker,
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
