import type { RefObject } from 'react'
import type { BattleSetup, Biome } from '../lib/engine'
import type { GameMode } from '../lib/game-mode'
import type { BotDifficulty } from '../lib/engine/ai'
import { INTRODUCTIONS } from '../lib/campaign'
import * as common from '../i18n/common'
import * as game from '../i18n/game'
import * as m from '../i18n/help'
import * as menus from '../i18n/menus'
import { BriefingElements } from './Briefing'
import { Icon } from './Icon'
import { dialogClassName, iconButtonClassName } from './styles'

interface GameHelpDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  mode: GameMode
  difficulty: BotDifficulty
  setup?: BattleSetup
  biome: Biome
  campaignLevel?: number
}

export function GameHelpDialog({
  dialogRef,
  mode,
  difficulty,
  setup,
  biome,
  campaignLevel,
}: GameHelpDialogProps) {
  const { hell, ...elements } = INTRODUCTIONS
  return (
    <dialog
      ref={dialogRef}
      className={dialogClassName}
      aria-labelledby="dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close()
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-line px-6 pt-6 pb-4 [&>button]:shrink-0">
        <h2 className="font-serif text-[30px] leading-tight" id="dialog-title">
          {game.howToPlay}
        </h2>
        <button
          className={iconButtonClassName}
          onClick={() => dialogRef.current?.close()}
          aria-label={common.closeDialog}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <p className="pt-5 text-[14px] leading-normal text-muted">
          {campaignLevel ? m.campaignIntro : setup ? m.customIntro : m.randomIntro}
          {setup &&
            mode !== 'local' &&
            ' ' + m.aiDifficulty(menus.difficulties[difficulty])}{' '}
          {mode === 'local'
            ? m.localPlayers
            : mode === 'online'
              ? m.onlinePlayers
              : m.aiPlayers}
          . {m.turnOrder}.
        </p>
        <BriefingElements
          elements={[...Object.values(elements).flat(), ...(biome === 'hell' ? hell : [])]}
        />
      </div>
    </dialog>
  )
}
