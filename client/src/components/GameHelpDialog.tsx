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
import { iconButtonClassName } from './styles'

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
      className="fixed inset-0 m-auto open:flex max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] flex-col rounded-2xl border border-[#d1cf9b40] bg-[var(--biome-panel,#20362b)] p-0 text-ink shadow-[0_25px_90px_#07180f99] backdrop:bg-[#091910b8] backdrop:backdrop-blur-[7px]"
      aria-labelledby="dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close()
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-line px-[25px] pt-[25px] pb-5 [&>button]:shrink-0">
        <h2 className="font-serif text-[27px] leading-[normal]" id="dialog-title">
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
      <div className="min-h-0 flex-1 overflow-y-auto px-[25px]">
        <p className="pt-4 text-[12px] leading-[1.5] text-muted">
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
