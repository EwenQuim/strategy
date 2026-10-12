import { activePawn, type GameState } from '../lib/engine/engine.ts'
import { hexDist } from '../lib/engine/hex.ts'
import { hpOf } from '../lib/engine/ai/choice.ts'
import type { TurnPlan } from '../lib/engine/ai/turns.ts'

// An authored debut demonstrates its signature once, then returns to ordinary tactics.
// If the player removes every opportunity, search the remaining legal turns normally.
export function introductionTurns<Plan extends TurnPlan>(
  state: GameState,
  plans: Plan[],
): Plan[] {
  const pawn = activePawn(state)!
  if (
    state.round !== 1 ||
    pawn.side !== 'enemy' ||
    !state.setup?.map ||
    !state.setup.firstEnemyKinds?.includes(pawn.kind)
  )
    return plans
  const demonstrations = plans.filter(
    (plan) =>
      plan.actions.some((action) => action.type === 'special') &&
      plan.state.pawns.some((p) => p.id === pawn.id) &&
      (state.pawns.some((p) => p.side !== pawn.side && hpOf(plan.state, p.id) < p.hp) ||
        plan.state.pawns.some((p) => p.id === pawn.id && p.protectingId !== null)),
  )
  if (!demonstrations.length) return plans
  const impact = (plan: TurnPlan) =>
    state.pawns.reduce((sum, p) => {
      const after = plan.state.pawns.find((next) => next.id === p.id)
      return (
        sum +
        (p.side !== pawn.side
          ? (p.hp - hpOf(plan.state, p.id)) * 100 + Number(!!after && hexDist(p, after) > 0)
          : (after?.bonusEnergy ?? 0) - p.bonusEnergy)
      )
    }, 0)
  const strongest = Math.max(...demonstrations.map(impact))
  return demonstrations.filter((plan) => impact(plan) === strongest)
}
