import { activePawn, reducer, type Action, type GameState } from './engine.ts'
import { canAttack } from './combat.ts'
import { key } from './hex.ts'
import type { Pawn, Side } from './pawns/index.ts'
import type { BotOptions } from './ai.ts'
import { distancesToAttack, evaluatePosition, type ReachCache } from './ai-evaluate.ts'
import { sidePlan } from './ai-plan.ts'
import { chooseOption, expected, hpOf, type Option, type Outcome } from './ai-choice.ts'

function generateCandidates(state: GameState): Action[][] {
  const pawn = activePawn(state)!
  if (pawn.energy <= 0) return [[{ type: 'endTurn' }]]
  const attacks = state.pawns
    .filter(
      (p) => p.side !== pawn.side && canAttack(pawn, p, state.tiles.get(key(pawn.q, pawn.r))),
    )
    .map((target): Action[] => [
      { type: 'act', action: 'attack' },
      { type: 'attackAt', q: target.q, r: target.r },
    ])
  return [
    [{ type: 'endTurn' }],
    ...pawn.ai.moves(pawn, state),
    ...attacks,
    ...pawn.special.candidates(pawn, state),
  ]
}

function withFoeEscape(state: GameState, side: Side, escape: (foe: Pawn) => number): GameState {
  return {
    ...state,
    pawns: state.pawns.map((pawn) => {
      if (pawn.side === side) return pawn
      const foe = pawn.clone()
      foe.escapeChance = escape(pawn)
      return foe
    }),
  }
}

// Escape rolls are scored by their odds: a 20% escape keeps 80% of the hit's value.
function expectedOutcomes(state: GameState, actions: Action[]): Outcome[] {
  const apply = (from: GameState) => actions.reduce(reducer, from)
  const side = activePawn(state)!.side
  const foes = state.pawns.filter((p) => p.side !== side)
  if (
    !actions.some((action) => action.type === 'attackAt' || action.type === 'specialAt') ||
    !foes.some((foe) => foe.escapeChance > 0)
  )
    return [{ state: apply(state), weight: 1 }]
  const original = new Map(foes.map((foe) => [foe.id, foe.escapeChance]))
  const hit = apply(withFoeEscape(state, side, () => 0))
  const dodge = apply(withFoeEscape(state, side, (foe) => (foe.escapeChance > 0 ? 100 : 0)))
  const struck = foes.filter((foe) => hpOf(hit, foe.id) !== hpOf(dodge, foe.id))
  const reset = (next: GameState) =>
    withFoeEscape(next, side, (foe) => original.get(foe.id) ?? foe.escapeChance)
  if (!struck.length) return [{ state: reset(hit), weight: 1 }]
  const escape = struck.reduce((sum, foe) => sum + foe.escapeChance, 0) / struck.length / 100
  return [
    { state: reset(hit), weight: 1 - escape },
    { state: reset(dodge), weight: escape },
  ]
}

function rankCandidates(state: GameState, score: (state: GameState) => number) {
  return generateCandidates(state)
    .map((actions) => {
      const outcomes = expectedOutcomes(state, actions)
      return { actions, outcomes, score: expected(outcomes, score) }
    })
    .sort((a, b) => b.score - a.score)
}

function searchTurn(
  state: GameState,
  depth: number,
  beamWidth: number,
  startingState: GameState,
  score: (state: GameState) => number,
): number {
  if (
    depth === 0 ||
    state.winner ||
    state.round !== startingState.round ||
    activePawn(state)?.id !== activePawn(startingState)?.id
  )
    return score(state)

  const ranked = rankCandidates(state, score)
  if (depth === 1) return ranked[0].score
  return Math.max(
    ...ranked
      .slice(0, beamWidth)
      .map((candidate) =>
        expected(candidate.outcomes, (next) =>
          searchTurn(next, depth - 1, beamWidth, startingState, score),
        ),
      ),
  )
}

export function chooseTacticalActions(state: GameState, options: BotOptions): Action[] {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  if (state.phase !== 'move') return [{ type: 'cancelTargeting' }]
  if (pawn.energy <= 0) return [{ type: 'endTurn' }]
  const distance = distancesToAttack(state, pawn)
  const reach: ReachCache = new Map()
  const plan = sidePlan(state, pawn.side, options)
  const score = (next: GameState) => evaluatePosition(next, pawn, plan, distance, reach)
  // A fixed random stream keeps the analysis from seeing the battle's future rolls, such as Hellfire.
  const analysis = { ...state, randomState: 0 }
  const valued: Option[] = rankCandidates(analysis, score)
    .slice(0, options.beamWidth)
    .map(({ actions, outcomes }) => ({
      actions,
      outcomes,
      value: expected(outcomes, (next) =>
        searchTurn(next, options.depth - 1, options.beamWidth, analysis, score),
      ),
    }))
    .sort((a, b) => b.value - a.value)
  return chooseOption(analysis, pawn, valued, options).actions
}
