import { useState } from 'react'
import { dialogClassName, iconButtonClassName, primaryButtonClassName } from './styles'
import { Icon, PawnIcon, type IconName } from './Icon'
import { hexPoints, terrainColors } from './hex-art'
import { TerrainArt } from './terrains/TerrainArt'
import { FeatureArt } from './features/FeatureArt'
import { markTutorialSeen, readTutorialSeen } from '../tutorial'
import type { CampaignLevel, IntroducedElement } from '../lib/campaign'
import { INTRODUCTIONS, type BriefingElement } from '../briefings'
import {
  BIOMES,
  PAWN_CLASSES,
  TILE_FEATURES,
  type PawnKind,
  type TileFeature,
} from '../lib/engine'
import * as common from '../i18n/common'
import * as h from '../i18n/help'
import * as m from '../i18n/game'
import { levelName } from '../i18n/campaign'

const isPawn = (art: IntroducedElement): art is PawnKind => art in PAWN_CLASSES
const isFeature = (art: IntroducedElement): art is TileFeature =>
  TILE_FEATURES.includes(art as TileFeature)

function ElementArt({ art, index }: { art: IntroducedElement; index: number }) {
  const accent = isPawn(art) ? PAWN_CLASSES[art].accent : 'var(--tile-base, #7d8963)'
  const delay = index * 120 + 'ms'

  return (
    <div
      className="relative size-[76px] shrink-0 max-[360px]:size-[64px]"
      style={{ animationDelay: delay }}
    >
      <div
        className="briefing-art-glow absolute -inset-2 rounded-full motion-reduce:animate-none"
        style={{
          background: `radial-gradient(circle, ${accent}38 0%, transparent 65%)`,
          animationDelay: delay,
        }}
      />
      <svg
        className="briefing-art-icon relative size-full drop-shadow-[0_4px_8px_#0006] motion-reduce:animate-none"
        viewBox="-38 -38 76 76"
        aria-hidden="true"
        style={{ animationDelay: delay }}
      >
        {isPawn(art) ? (
          <>
            <polygon points={hexPoints} fill="var(--tile-base, #263f30)" />
            <polygon
              points={hexPoints}
              fill="none"
              stroke={accent}
              strokeOpacity=".2"
              strokeWidth="1"
              transform="scale(1.1)"
            />
            <circle r="22" fill="url(#player-chip)" stroke="#b2ceaa" strokeWidth="1.5" />
            <circle r="17.5" fill="none" stroke="#f5e5bf" strokeOpacity=".12" />
            <g transform="translate(-12 -12)" color={art === 'king' ? '#f0d38e' : '#f1e8d2'}>
              <PawnIcon kind={art} />
            </g>
          </>
        ) : isFeature(art) ? (
          <>
            <polygon points={hexPoints} fill={terrainColors.plain} />
            <FeatureArt feature={art} />
          </>
        ) : art === 'hell' ? (
          <>
            <polygon points={hexPoints} fill={terrainColors.basalt} />
            <polygon points={hexPoints} fill="url(#hellfire-hatch)" />
          </>
        ) : (
          <>
            <polygon points={hexPoints} fill={terrainColors[art]} />
            <TerrainArt terrain={art} variant={0} />
          </>
        )}
      </svg>
    </div>
  )
}

function StatChip({
  icon,
  value,
  color,
}: {
  icon: IconName
  value: string | number
  color: string
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-[#ffffff08] px-1.5 py-0.5 text-[12px] font-semibold leading-none text-ink">
      <Icon name={icon} className={'size-[11px] ' + color} />
      {value}
    </span>
  )
}

function ElementCard({ element, index }: { element: BriefingElement; index: number }) {
  const delay = index * 90 + 'ms'
  const hasArt = element.art !== undefined

  return (
    <li
      className="briefing-card motion-reduce:animate-none flex items-start gap-3.5 rounded-xl border border-line bg-[#ffffff06] px-3.5 py-3.5"
      style={{ animationDelay: delay }}
    >
      {hasArt && <ElementArt art={element.art} index={index} />}
      <div className="min-w-0 flex-1">
        <strong className="block font-serif text-[19px] leading-snug text-gold">
          {element.name}
        </strong>

        {element.stats && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatChip icon="heart" value={element.stats.hp} color="text-[#d59d81]" />
            <StatChip icon="sword" value={element.stats.damage} color="text-[#c4d1a5]" />
            <StatChip icon="target" value={element.stats.range} color="text-[#a4af99]" />
          </div>
        )}

        {element.special && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-snug">
            <span className="font-semibold text-gold">{element.special.name}</span>
            <span className="inline-flex items-center gap-0.5 rounded bg-[#ffffff0d] px-1 py-px text-[11px] font-semibold text-[#b8c4e0]">
              <Icon name="energy" className="size-2.5" />
              {element.special.cost}
            </span>
            <span className="text-muted">{element.special.description}</span>
          </div>
        )}

        {element.points.length > 0 && (
          <ul className="mb-0 mt-1.5 list-none space-y-1 text-[13px] leading-snug text-muted">
            {element.points.map((point) => (
              <li
                key={point}
                className="relative pl-3 before:absolute before:top-[7px] before:left-0 before:size-[5px] before:rounded-full before:bg-line"
              >
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

export function BriefingElements({ elements }: { elements: readonly BriefingElement[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0 py-5">
      {elements.map((element, index) => (
        <ElementCard key={element.name} element={element} index={index} />
      ))}
    </ul>
  )
}

function showBriefing(dialog: HTMLDialogElement) {
  dialog.showModal()
  return () => dialog.close()
}

export function Briefing({ level }: { level: CampaignLevel }) {
  return (
    <dialog
      ref={showBriefing}
      className={dialogClassName}
      style={BIOMES[level.setup.biome].theme}
      aria-labelledby="briefing-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <form
        method="dialog"
        className="flex shrink-0 items-start justify-between gap-2.5 border-b border-line px-6 pt-6 pb-4 [&>button]:-mt-1 [&>button]:-mr-2 [&>button]:shrink-0"
      >
        <div>
          <span className="text-[11px] font-semibold tracking-[0.17em] text-muted uppercase">
            {m.levelNumber(String(level.id).padStart(2, '0'))}
          </span>
          <h2 className="mt-1 font-serif text-[30px] leading-tight" id="briefing-title">
            {levelName(level)}
          </h2>
        </div>
        <button className={iconButtonClassName} type="submit" aria-label={common.closeDialog}>
          <Icon name="close" />
        </button>
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <BriefingElements
          elements={level.newElements.flatMap((element) => INTRODUCTIONS[element])}
        />
      </div>
      <form method="dialog" className="shrink-0 px-6 pb-6">
        <button type="submit" className={primaryButtonClassName + ' min-h-12 w-full'}>
          {m.go}
        </button>
      </form>
    </dialog>
  )
}

export function QuickPlayTutorial() {
  const [seen] = useState(readTutorialSeen)
  if (seen) return null
  return (
    <dialog
      ref={showBriefing}
      onClose={markTutorialSeen}
      className={dialogClassName}
      aria-labelledby="quick-play-tutorial-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <form
        method="dialog"
        className="flex shrink-0 items-start justify-between gap-2.5 border-b border-line px-6 pt-6 pb-4 [&>button]:-mt-1 [&>button]:-mr-2 [&>button]:shrink-0"
      >
        <h2
          className="mt-1 font-serif text-[30px] leading-tight"
          id="quick-play-tutorial-title"
        >
          {common.quickPlay}
        </h2>
        <button className={iconButtonClassName} type="submit" aria-label={common.closeDialog}>
          <Icon name="close" />
        </button>
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <p className="pt-5 text-[14px] leading-normal text-muted">
          {h.randomIntro} {h.aiPlayers}. {h.turnOrder}.
        </p>
        <BriefingElements elements={INTRODUCTIONS.king} />
      </div>
      <form method="dialog" className="shrink-0 px-6 pb-6">
        <button type="submit" className={primaryButtonClassName + ' min-h-12 w-full'}>
          {m.go}
        </button>
      </form>
    </dialog>
  )
}
