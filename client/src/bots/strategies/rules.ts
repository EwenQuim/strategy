import { activePawn, type Action, type GameState } from '../../lib/engine/engine.ts'
import { specialTargets } from '../../lib/engine/combat.ts'
import type { Pawn } from '../../lib/engine/pawns/index.ts'
import { distFrom, key, neighbors, passable } from '../../lib/engine/hex.ts'
import type { Bot } from '../bot.ts'
import type { TargetPicker } from '../targetPicker.ts'

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
    return ruleAbility(state, pawn, foes, this.picker) ?? ruleApproach(state, pawn)
  }
}

function ruleAbility(
  state: GameState,
  pawn: Pawn,
  foes: Pawn[],
  picker: TargetPicker,
): Action[] | null {
  const own = pawn.ai.ruleSpecial?.(pawn, state, foes, specialTargets(state.pawns, pawn))
  if (own) return [own]
  const candidates = pawn.special.candidates(pawn, state)
  if (pawn.special.areaTargets) {
    const best = candidates
      .map((action) => {
        const targets =
          action.type === 'special' && action.target
            ? pawn.special.areaTargets!(state.pawns, action.target, pawn)
            : []
        const score = targets.reduce(
          (sum, target) => sum + (target.side === pawn.side ? -1 : 1),
          0,
        )
        return { action, targets, score }
      })
      .filter(
        ({ score, targets }) =>
          score > 0 &&
          !targets.some((p) => p.side === pawn.side && p.kind === 'king' && p.hp <= 1),
      )
      .sort((a, b) => b.score - a.score)[0]
    return best ? [best.action] : null
  }
  const target = picker.chooseTarget(
    pawn,
    foes.filter((foe) =>
      candidates.some(
        (action) =>
          action.type === 'special' && action.target?.q === foe.q && action.target.r === foe.r,
      ),
    ),
  )
  const selected =
    target &&
    candidates.find(
      (action) =>
        action.type === 'special' &&
        action.target?.q === target.q &&
        action.target.r === target.r,
    )
  return selected ? [selected] : null
}

function ruleApproach(state: GameState, pawn: Pawn): Action[] {
  const occupied = new Set(
    state.pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)),
  )
  const firingTiles = [...state.tiles.values()].filter(
    (tile) =>
      passable(tile) &&
      !occupied.has(key(tile.q, tile.r)) &&
      pawn.special.targets(pawn, state.pawns, tile).length > 0,
  )
  const dist = distFrom(
    new Map([...state.tiles].filter(([position]) => !occupied.has(position))),
    firingTiles,
  )
  const here = dist.get(key(pawn.q, pawn.r)) ?? Infinity
  // Mobility abilities (Rush) may choose an empty tile without an enemy target.
  const sprint = pawn.special
    .candidates(pawn, state)
    .filter((action) => action.type === 'special' && action.target)
    .map((action) => ({ action, at: action.type === 'special' ? action.target! : pawn }))
    .filter(({ at }) => (dist.get(key(at.q, at.r)) ?? Infinity) < here)
    .sort(
      (a, b) =>
        (dist.get(key(a.at.q, a.at.r)) ?? Infinity) -
        (dist.get(key(b.at.q, b.at.r)) ?? Infinity),
    )[0]
  if (sprint) return [sprint.action]
  const step = neighbors(pawn.q, pawn.r)
    .filter(
      (tile) =>
        !occupied.has(key(tile.q, tile.r)) &&
        (dist.get(key(tile.q, tile.r)) ?? Infinity) < here &&
        (pawn.hp > 1 || state.tiles.get(key(tile.q, tile.r))?.terrain !== 'lava'),
    )
    .sort((a, b) => dist.get(key(a.q, a.r))! - dist.get(key(b.q, b.r))!)[0]
  return step && pawn.energy >= pawn.moveCost
    ? [{ type: 'move', q: step.q, r: step.r }]
    : [{ type: 'endTurn' }]
}
