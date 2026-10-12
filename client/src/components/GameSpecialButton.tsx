import type { Action, Aim, Pawn } from '../lib/engine'
import { canUseSpecial } from '../lib/engine'
import * as m from '../i18n/game'
import { specialTexts } from '../i18n/specialTexts'
import { CommandButton } from './CommandAction'
import { usePreviewButton, type PreviewProps } from './usePreviewButton'

interface SpecialStatus {
  pawn?: Pawn
  commanding: boolean
  usingSpecial: boolean
  hasSpecialTargets: boolean
  targetCount: number
  choosingTarget: boolean
}

type GameSpecialButtonProps = SpecialStatus &
  PreviewProps & {
    dispatch: (action: Action) => void
    onAim: (aim: Aim | null) => void
  }

export function GameSpecialButton({
  pawn,
  usingSpecial,
  hasSpecialTargets,
  targetCount,
  choosingTarget,
  dispatch,
  onAim,
  ...preview
}: GameSpecialButtonProps) {
  const buttonProps = usePreviewButton(
    !preview.commanding || !pawn || !canUseSpecial(pawn) || !hasSpecialTargets,
    () => {
      if (usingSpecial) onAim(null)
      else if (pawn?.special.targeted) onAim({ action: 'special' })
      else dispatch({ type: 'special' })
    },
    preview,
  )
  return (
    <CommandButton
      variant="special"
      icon={usingSpecial ? 'close' : 'spark'}
      label={usingSpecial ? m.cancel : pawn ? specialTexts[pawn.special.name] : m.special}
      note={specialNote({
        pawn,
        commanding: preview.commanding,
        usingSpecial,
        hasSpecialTargets,
        targetCount,
        choosingTarget,
      })}
      data-action="special"
      {...buttonProps}
      title={pawn ? specialTexts[pawn.special.description] : undefined}
      aria-pressed={usingSpecial}
    />
  )
}

function specialNote({
  pawn,
  commanding,
  usingSpecial,
  hasSpecialTargets,
  targetCount,
  choosingTarget,
}: SpecialStatus): string {
  if (usingSpecial) {
    if (!targetCount) return m.noTargets
    if (choosingTarget) return m.chooseEnemy
    return pawn?.special.prompt ? specialTexts[pawn.special.prompt] : m.chooseEnemy
  }
  if (commanding) {
    if (pawn?.specialUsed) return m.usedThisRound
    if (!hasSpecialTargets) {
      if (pawn && pawn.energy < pawn.special.cost) return m.notEnoughEnergy(pawn.special.cost)
      return pawn?.special.noTargets ? specialTexts[pawn.special.noTargets] : m.noTargets
    }
  }
  return m.energyCost(pawn?.special.cost ?? 2)
}
