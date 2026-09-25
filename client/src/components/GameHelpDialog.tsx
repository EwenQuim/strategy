import type { RefObject } from 'react'
import {
  TILE_FEATURES,
  PAWN_CLASSES,
  ESCAPE_BONUS,
  MAX_ESCAPE,
  type BattleSetup,
  type Biome,
} from '../lib/engine'
import type { GameMode } from '../lib/game-mode'
import type { BotDifficulty } from '../lib/engine/ai'
import * as common from '../i18n/common'
import * as game from '../i18n/game'
import * as m from '../i18n/help'
import * as menus from '../i18n/menus'
import { Icon } from './Icon'
import { iconButtonClassName } from './styles'

const classes = Object.values(PAWN_CLASSES).map((Unit) => new Unit(0, 0, 0, 'player'))

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
  const cards = [
    { title: m.energyTitle, points: m.energyPoints },
    { title: m.combatTitle, points: m.combatPoints },
    {
      title: m.terrainTitle,
      points: [
        ...m.terrainPoints,
        ...Object.values(TILE_FEATURES).map(
          (feature) => feature.name + ': ' + feature.description,
        ),
        ...(biome === 'hell' ? m.hellfirePoints : []),
      ],
    },
    ...classes.map((unit) => ({
      title: m.unitTitle(unit.kind, unit.maxHp),
      points: [
        m.unitAttack(
          unit.attack.damage,
          unit.attack.minRange === unit.attack.maxRange
            ? String(unit.attack.maxRange)
            : unit.attack.minRange + '-' + unit.attack.maxRange,
        ),
        m.unitSpecial(unit.special.name, unit.special.cost, unit.special.description),
      ],
    })),
    {
      title: m.turnTitle,
      points: [
        m.escapePoint(ESCAPE_BONUS, MAX_ESCAPE),
        mode === 'local' ? m.localPlayers : mode === 'online' ? m.onlinePlayers : m.aiPlayers,
        m.turnOrder,
      ],
    },
  ]

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
      <div className="min-h-0 flex-1 overflow-y-auto px-[25px] pb-5">
        <p className="pt-4 text-[12px] leading-[1.5] text-muted">
          {campaignLevel ? m.campaignIntro : setup ? m.customIntro : m.randomIntro}
          {setup && mode !== 'local' && ' ' + m.aiDifficulty(menus.difficulties[difficulty])}
        </p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 pt-4">
          {cards.map((card) => (
            <li
              className="rounded-lg border border-line bg-[#ffffff04] px-3 py-2.5"
              key={card.title}
            >
              <strong className="mb-1 block text-[13px] text-gold capitalize">
                {card.title}
              </strong>
              <ul className="m-0 list-disc pl-4 text-[12px] leading-[1.5] text-muted">
                {card.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  )
}
