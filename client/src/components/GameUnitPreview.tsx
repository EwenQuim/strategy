import type { Pawn } from '../lib/engine'
import * as m from '../i18n/game'
import { specialTexts } from '../i18n/specialTexts'
import { CommandButton, CommandPanel } from './CommandAction'

export function GameUnitPreview({ pawn, onClose }: { pawn: Pawn; onClose?: () => void }) {
  return (
    <>
      <CommandPanel
        icon="spark"
        label={specialTexts[pawn.special.name]}
        note={m.energyCost(pawn.special.cost)}
        data-testid="preview-ability"
        title={specialTexts[pawn.special.description]}
      />
      {onClose && (
        <CommandButton
          variant="compact"
          icon="close"
          label={m.stopPreviewing}
          onClick={onClose}
          aria-label={m.stopPreviewing}
          title={m.stopPreviewing}
        />
      )}
    </>
  )
}
