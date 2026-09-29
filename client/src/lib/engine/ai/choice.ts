import { hexDist } from '../hex.ts'
import type { Action, GameState } from '../engine.ts'
import type { Pawn } from '../pawns/index.ts'
import type { BotOptions } from '../ai.ts'

export type Outcome = { state: GameState; weight: number }
export type Option = { actions: Action[]; outcomes: Outcome[]; value: number }

const expected = (outcomes: Outcome[], value: (state: GameState) => number) =>
  outcomes.reduce((sum, outcome) => sum + outcome.weight * value(outcome.state), 0)

export const hpOf = (state: GameState, id: number) =>
  state.pawns.find((p) => p.id === id)?.hp ?? 0

const damageTo = (option: Option, pawns: Pawn[]) =>
  expected(option.outcomes, (state) =>
    pawns.reduce((sum, pawn) => sum + pawn.hp - hpOf(state, pawn.id), 0),
  )

function focusTargets(foes: Pawn[], pawn: Pawn, focus: BotOptions['focus']): Pawn[] {
  if (focus === 'nearest')
    return foes.toSorted((a, b) => hexDist(pawn, a) - hexDist(pawn, b)).slice(0, 1)
  if (focus === 'weakest') return foes.toSorted((a, b) => a.hp - b.hp).slice(0, 1)
  return []
}

// Guardrails hold at every difficulty. A deviation must deal more damage than the best option,
// so it is never idle or a pointless sacrifice, and latitude stays far below the victory and
// lethal king scores, so it never gives up a win or exposes the king.
export function chooseOption(
  root: GameState,
  pawn: Pawn,
  ranked: Option[],
  options: BotOptions,
): Option {
  const foes = root.pawns.filter((p) => p.side !== pawn.side)
  const focus = focusTargets(foes, pawn, options.focus)
  const appeal = (option: Option) => [damageTo(option, focus), damageTo(option, foes)]
  const moreAppealing = (option: Option, than: Option) => {
    const [focusDamage, damage] = appeal(option)
    const [chosenFocus, chosenDamage] = appeal(than)
    return focusDamage > chosenFocus || (focusDamage === chosenFocus && damage > chosenDamage)
  }
  const [best] = ranked
  return ranked
    .filter((option) => option.value >= best.value - options.latitude)
    .reduce((chosen, option) => (moreAppealing(option, chosen) ? option : chosen), best)
}
