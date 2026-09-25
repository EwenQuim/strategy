import type { RefObject } from 'react'
import {
  BIOMES,
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
import * as m from '../i18n/help'
import * as menus from '../i18n/menus'
import { Icon, PawnIcon } from './Icon'
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
  const local = mode === 'local'
  const isOnline = mode === 'online'

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] rounded-2xl border border-[#d1cf9b40] bg-[var(--biome-panel,#20362b)] p-0 text-ink shadow-[0_25px_90px_#07180f99] backdrop:bg-[#091910b8] backdrop:backdrop-blur-[7px]"
      aria-labelledby="dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close()
      }}
    >
      <div className="p-[25px]">
        <div className="flex items-center justify-between gap-2.5 border-b border-line pb-5 [&>button]:shrink-0">
          <div>
            <span className="text-muted text-[9px] font-semibold tracking-[0.17em] uppercase">
              {m.eyebrow}
            </span>
            <h2 className="mt-2 font-serif text-[27px] leading-[normal]" id="dialog-title">
              {m.title}
            </h2>
          </div>
          <button
            className={iconButtonClassName}
            onClick={() => dialogRef.current?.close()}
            aria-label={common.closeDialog}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="text-[12px] leading-[1.8] text-[#c5ceba] [&>p]:pt-5 [&>section]:flex [&>section]:gap-[15px] [&>section]:pt-[22px] [&>section>svg]:mt-[3px] [&>section>svg]:w-[21px] [&>section>svg]:shrink-0 [&>section>svg]:text-gold">
          <p>
            {campaignLevel ? m.campaignIntro : setup ? m.customIntro : m.randomIntro}{' '}
            {setup && !local && m.aiDifficulty(menus.difficulties[difficulty]) + ' '}
            {setup?.map
              ? m.designedMap
              : Object.values(BIOMES)
                  .map((b) => m.biomeLine(b.name, b.description))
                  .join(' ')}
          </p>
          <section>
            <Icon name="energy" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">{m.energyTitle}</h3>
              <p>{m.energyBody}</p>
            </div>
          </section>
          <section>
            <Icon name="sword" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">{m.moveTitle}</h3>
              <p>{m.moveBody}</p>
            </div>
          </section>
          <section>
            <Icon name="hex" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">{m.centerTitle}</h3>
              <p>{m.centerOdds}</p>
              {Object.values(TILE_FEATURES).map((feature) => (
                <p key={feature.name}>
                  <b>{feature.name}.</b> {feature.description}
                </p>
              ))}
              <p>{m.lavaBody}</p>
              {biome === 'hell' && <p>{m.hellfireBody}</p>}
            </div>
          </section>
          {classes.map((unit) => (
            <section key={unit.kind}>
              <PawnIcon kind={unit.kind} />
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-ink capitalize">
                  {m.unitTitle(unit.kind, unit.maxHp)}
                </h3>
                <p>
                  {m.unitBody(
                    unit.attack.damage,
                    unit.attack.minRange === unit.attack.maxRange
                      ? String(unit.attack.maxRange)
                      : unit.attack.minRange + '-' + unit.attack.maxRange,
                    unit.special.name,
                    unit.special.cost,
                  )}{' '}
                  {unit.special.description}
                </p>
              </div>
            </section>
          ))}
          <section>
            <Icon name="escape" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">{m.escapeTitle}</h3>
              <p>{m.escapeBody(ESCAPE_BONUS, MAX_ESCAPE)}</p>
            </div>
          </section>
          <section>
            <Icon name="history" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">{m.roundTitle}</h3>
              <p>
                {m.roundBody}{' '}
                {local ? m.localPlayers : isOnline ? m.onlinePlayers : m.aiPlayers}{' '}
                {m.turnOrder}
              </p>
            </div>
          </section>
        </div>
      </div>
    </dialog>
  )
}
