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
              Commander's field notes
            </span>
            <h2 className="mt-2 font-serif text-[27px] leading-[normal]" id="dialog-title">
              The art of the turn.
            </h2>
          </div>
          <button
            className={iconButtonClassName}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close dialog"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="text-[12px] leading-[1.8] text-[#c5ceba] [&>p]:pt-5 [&>section]:flex [&>section]:gap-[15px] [&>section]:pt-[22px] [&>section>svg]:mt-[3px] [&>section>svg]:w-[21px] [&>section>svg]:shrink-0 [&>section>svg]:text-gold">
          <p>
            {campaignLevel
              ? 'This campaign battle has fixed armies and terrain. Defeat the enemy king to unlock the next level. Losing or leaving does not erase completed levels.'
              : setup
                ? 'This custom battle uses your chosen armies and biome. Defeat the opposing king to win; losing yours ends the battle.'
                : 'Each army has one king, at least one swordsman, and three random recruits. Repeated classes are possible. Both sides get the same lineup, chosen by the game seed. Defeat the enemy king to win; losing yours ends the battle.'}{' '}
            {setup && !local && 'AI difficulty: ' + difficulty + '. '}
            {setup?.map
              ? 'Terrain and starting positions are designed for this level; the biome sets its visual theme.'
              : Object.values(BIOMES)
                  .map((b) => b.name + ' has ' + b.description + '.')
                  .join(' ')}
          </p>
          <section>
            <Icon name="energy" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">
                Three energy. Every round.
              </h3>
              <p>
                Each unit starts with 3 energy. The lit unit is yours to command. Moving costs 1
                energy per tile; a Bulwark pays 2 for its first tile and 1 after. Numbers show
                the full cost. Mountains and lakes block walking and Charge. Arrows and magic
                pass over them.
              </p>
            </div>
          </section>
          <section>
            <Icon name="sword" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">Make your move.</h3>
              <p>
                Normal attacks cost 1 energy. Each class has its own damage and range. Choose
                Attack or a targeted special, then a highlighted target. Jump selects an empty
                landing tile, not an enemy. Rally heals every adjacent ally immediately. Protect
                selects an adjacent ally; a shield marks the protected unit. Charge first asks
                for a destination, then an adjacent enemy. Cancelling either step costs nothing.
                Ranged attacks can pass over terrain.
              </p>
            </div>
          </section>
          <section>
            <Icon name="hex" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">Control the center.</h3>
              <p>
                Random maps have zero (50%), one (40%), or two (10%) special tiles, only in the
                two middle rows.
              </p>
              {Object.values(TILE_FEATURES).map((feature) => (
                <p key={feature.name}>
                  <b>{feature.name}.</b> {feature.description}
                </p>
              ))}
              <p>
                Lava costs 1 health for every tile entered, including during Charge. Damage
                cannot be escaped or redirected by Protect and can be lethal. Jump crosses lava
                safely but landing on it deals damage. Forests and palms are decorative.
              </p>
              {biome === 'hell' && (
                <p>
                  Hellfire warnings stay fixed for the full round. At round end, units on
                  hatched tiles take 1 damage, ignoring Escape and Protect. Move clear before
                  the last unit finishes. If both kings fall, the battle is a draw.
                </p>
              )}
            </div>
          </section>
          {classes.map((unit) => (
            <section key={unit.kind}>
              <PawnIcon kind={unit.kind} />
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-ink capitalize">
                  {unit.kind}: {unit.maxHp} health
                </h3>
                <p>
                  {unit.attack.damage} damage, range{' '}
                  {unit.attack.minRange === unit.attack.maxRange
                    ? unit.attack.maxRange
                    : unit.attack.minRange + '-' + unit.attack.maxRange}
                  . {unit.special.name} costs {unit.special.cost} energy.{' '}
                  {unit.special.description}
                </p>
              </div>
            </section>
          ))}
          <section>
            <Icon name="escape" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">
                Live to fight another turn.
              </h3>
              <p>
                End turn converts all remaining energy into Escape: +{ESCAPE_BONUS} percentage
                points per energy, up to {MAX_ESCAPE}% chance to avoid each incoming attack. The
                bonus lasts until the round ends. It is not a movement action.
              </p>
            </div>
          </section>
          <section>
            <Icon name="history" />
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">
                A fresh round. The same order.
              </h3>
              <p>
                End turn spends your remaining energy and passes to the next unit. Running out
                of energy also ends your turn, with no extra Escape bonus.{' '}
                {local
                  ? 'Share this device: Player 1 commands green units and Player 2 commands red units. Follow the turn indicator for each unit; the same player may act several times in a row.'
                  : isOnline
                    ? 'You play against a real opponent online. Only your own units answer to you; wait while the opponent acts. Moves sync every few seconds.'
                    : 'You move first; enemy units act automatically.'}{' '}
                Turn order is decided once at the start and stays the same, skipping fallen
                units. Each new round restores all energy and resets Escape to 0%.
              </p>
            </div>
          </section>
        </div>
      </div>
    </dialog>
  )
}
