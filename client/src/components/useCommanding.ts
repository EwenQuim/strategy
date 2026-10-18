import { useState } from 'react'
import * as bf from '../i18n/battlefield'
import * as m from '../i18n/game'
import { specialTexts } from '../i18n/specialTexts'
import {
  canUseSpecial,
  movementDestinations,
  specialTargetingTiles,
  type Aim,
  type GameState,
  type Pawn,
} from '../lib/engine'
import { tileChoices, type Targeting, type TileChoice } from '../lib/tileChoices'
import { useInspection } from './useInspection'

function resolveTargetLabel(aim: Aim | null, pawn: Pawn | undefined) {
  if (aim?.action === 'special' && !aim.destination && pawn?.special.targetLabel)
    return specialTexts[pawn.special.targetLabel]
  return pawn ? specialTexts[pawn.special.name] : m.special
}

function resolveTargeting(
  usingSpecial: boolean,
  pawn: Pawn | undefined,
  choosingEnemy: boolean,
): Targeting {
  if (choosingEnemy) return 'strike'
  if (usingSpecial && pawn?.special.movement === 'walk') return 'charge'
  if (usingSpecial && pawn?.special.movement === 'jump') return 'jump'
  return 'special'
}

// The active side's command modes. Move opens each activation by default — the board is
// alive immediately — and the player can drop it for a quieter board until the next one.
export function useCommanding(
  state: GameState,
  pawn: Pawn | undefined,
  commanding: boolean,
  canCommand: boolean,
  opponentActive: boolean,
) {
  // Aiming belongs to the state it started on: any new state, ours or not, drops it.
  const [aiming, setAiming] = useState<{ state: GameState; aim: Aim } | null>(null)
  const aim = canCommand && aiming?.state === state ? aiming.aim : null
  // A dismissal belongs to one activation: it survives that pawn's own actions and
  // expires when its next activation comes around.
  const [dismissed, setDismissed] = useState<{ pawnId: number; round: number } | null>(null)
  // An aim cancellation belongs to one state: it quiets the board until the pawn or
  // the battle moves on, unlike a dismissal, which lasts the whole activation.
  const [canceled, setCanceled] = useState<{ state: GameState; pawnId: number } | null>(null)
  const moveMode =
    !!pawn &&
    !aim &&
    !(canceled?.state === state && canceled.pawnId === pawn.id) &&
    !(dismissed?.pawnId === pawn.id && dismissed.round === state.round)
  const insight = useInspection(state, !!aim)
  const { inspected } = insight
  const setAim = (next: Aim | null) => {
    insight.close()
    // Canceling the ability quiets the board instead of falling back to moving:
    // the player left the mode, not switched to another.
    if (!next && aim && pawn) setCanceled({ state, pawnId: pawn.id })
    setAiming(next && { state, aim: next })
  }
  const setMoveMode = (on: boolean) => {
    if (!pawn) return
    insight.close()
    setAiming(null)
    setCanceled(null)
    setDismissed(on ? null : { pawnId: pawn.id, round: state.round })
  }
  const hasSpecialTargets =
    !!pawn && specialTargetingTiles(pawn, state.tiles, state.pawns).size > 0
  const usingSpecial = aim?.action === 'special'
  const destination = usingSpecial ? aim.destination : undefined
  const choices = aim ? tileChoices(state, aim) : new Map<string, TileChoice>()
  const targetLabel = resolveTargetLabel(aim, pawn)
  const targeting = resolveTargeting(usingSpecial, pawn, !!destination)
  // The top banner always shows the side's current command mode; it never announces.
  const commandMode =
    commanding && usingSpecial && pawn
      ? { mode: 'ability' as const, label: bf.abilityMode(specialTexts[pawn.special.name]) }
      : commanding && moveMode
        ? { mode: 'move' as const, label: bf.moveMode }
        : { mode: 'none' as const, label: opponentActive ? m.enemyTurn : bf.noMode }

  // Reach stays up while an own action's effect frame plays: it is computed from the
  // post-action state, so the playback-end render changes no tile costs.
  const reach =
    commanding && moveMode && pawn && pawn.energy > 0 && !inspected
      ? movementDestinations(state.tiles, state.pawns, pawn)
      : new Map<string, number>()

  // Pressing A aims the ability, and aiming again drops every mode; it never previews.
  const toggleAim = () => {
    if (!canCommand || !pawn) return
    if (aim) setAim(null)
    else if (canUseSpecial(pawn) && hasSpecialTargets) setAim({ action: 'special' })
  }

  // Tapping the active character cycles the command modes: none, then move and ability.
  const cycleCommand = () => {
    if (!canCommand || !pawn) return
    if (aim) return setAim(null)
    if (moveMode) return toggleAim()
    setMoveMode(true)
  }

  // A commanded move keeps the turn, and attacking is the most probable next action:
  // like an aim, the expectation belongs to the state it started on and lands only on
  // the moved state.
  const [attackAfterMove, setAttackAfterMove] = useState<{
    state: GameState
    pawnId: number
  } | null>(null)
  if (attackAfterMove && attackAfterMove.state !== state && canCommand) {
    if (pawn && pawn.id === attackAfterMove.pawnId && canUseSpecial(pawn) && hasSpecialTargets)
      setAim({ action: 'special' })
    setAttackAfterMove(null)
  }
  const commandedMove = () => {
    if (pawn) setAttackAfterMove({ state, pawnId: pawn.id })
  }

  return {
    aim,
    moveMode,
    usingSpecial,
    destination,
    choices,
    targetLabel,
    targeting,
    reach,
    hasSpecialTargets,
    commandMode,
    insight,
    setAim,
    setMoveMode,
    toggleAim,
    cycleCommand,
    commandedMove,
  }
}
