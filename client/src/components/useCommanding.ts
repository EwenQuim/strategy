import { useState } from 'react'
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
) {
  // Aiming belongs to the state it started on: any new state, ours or not, drops it.
  const [aiming, setAiming] = useState<{ state: GameState; aim: Aim } | null>(null)
  const aim = canCommand && aiming?.state === state ? aiming.aim : null
  // A dismissal belongs to one activation: it survives that pawn's own actions and
  // expires when its next activation comes around.
  const [dismissed, setDismissed] = useState<{ pawnId: number; round: number } | null>(null)
  const moveMode =
    !!pawn && !aim && !(dismissed?.pawnId === pawn.id && dismissed.round === state.round)
  const insight = useInspection(state, !!aim)
  const { inspected } = insight
  const setAim = (next: Aim | null) => {
    insight.close()
    setAiming(next && { state, aim: next })
  }
  const setMoveMode = (on: boolean) => {
    if (!pawn) return
    insight.close()
    setAiming(null)
    setDismissed(on ? null : { pawnId: pawn.id, round: state.round })
  }
  const hasSpecialTargets =
    !!pawn && specialTargetingTiles(pawn, state.tiles, state.pawns).size > 0
  const usingSpecial = aim?.action === 'special'
  const destination = usingSpecial ? aim.destination : undefined
  const choices = aim ? tileChoices(state, aim) : new Map<string, TileChoice>()
  const targetLabel = resolveTargetLabel(aim, pawn)
  const targeting = resolveTargeting(usingSpecial, pawn, !!destination)

  // Reach stays up while an own action's effect frame plays: it is computed from the
  // post-action state, so the playback-end render changes no tile costs.
  const reach =
    commanding && moveMode && pawn && pawn.energy > 0 && !inspected
      ? movementDestinations(state.tiles, state.pawns, pawn)
      : new Map<string, number>()

  // Pressing A toggles between moving and attacking, never previewing.
  const toggleAim = () => {
    if (!canCommand || !pawn) return
    if (aim) setAim(null)
    else if (canUseSpecial(pawn) && hasSpecialTargets) setAim({ action: 'special' })
  }

  // Tapping the active character cycles the command modes: none, move, ability.
  const cycleCommand = () => {
    if (!canCommand || !pawn) return
    if (aim) return setAim(null)
    if (moveMode) return toggleAim()
    setMoveMode(true)
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
    insight,
    setAim,
    setMoveMode,
    toggleAim,
    cycleCommand,
  }
}
