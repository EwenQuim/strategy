import { dialogClassName, iconButtonClassName, primaryButtonClassName } from './styles'
import { Icon, PawnIcon } from './Icon'
import { hexPoints, terrainColors } from './hex-art'
import { TerrainArt } from './terrains/TerrainArt'
import { FeatureArt } from './features/FeatureArt'
import type { BriefingElement, CampaignLevel, IntroducedElement } from '../lib/campaign'
import {
  BIOMES,
  PAWN_CLASSES,
  TILE_FEATURES,
  type PawnKind,
  type TileFeature,
} from '../lib/engine'
import * as common from '../i18n/common'
import * as m from '../i18n/game'

const isPawn = (art: IntroducedElement): art is PawnKind => art in PAWN_CLASSES
const isFeature = (art: IntroducedElement): art is TileFeature => art in TILE_FEATURES

function ElementArt({ art }: { art: IntroducedElement }) {
  return (
    <svg
      className="size-16 shrink-0 max-[360px]:size-12"
      viewBox="-34 -34 68 68"
      aria-hidden="true"
    >
      {isPawn(art) ? (
        <>
          <polygon points={hexPoints} fill="var(--tile-base, #263f30)" />
          <circle r="22" fill="url(#player-chip)" stroke="#b2ceaa" strokeWidth="1.5" />
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
  )
}

export function BriefingElements({ elements }: { elements: readonly BriefingElement[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0 py-5">
      {elements.map((element) => (
        <li
          className="flex items-center gap-4 rounded-xl border border-line bg-[#ffffff06] px-4 py-3.5"
          key={element.name}
        >
          {element.art && <ElementArt art={element.art} />}
          <div className="min-w-0">
            <strong className="block text-base text-gold">{element.name}</strong>
            <ul className="mt-1 mb-0 list-disc pl-4 text-sm leading-normal text-muted marker:text-line">
              {element.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </li>
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
          <span className="text-xs font-semibold tracking-[0.17em] text-muted uppercase">
            {m.levelNumber(String(level.id).padStart(2, '0'))}
          </span>
          <h2 className="mt-1 font-serif text-3xl leading-tight" id="briefing-title">
            {level.name}
          </h2>
        </div>
        <button className={iconButtonClassName} type="submit" aria-label={common.closeDialog}>
          <Icon name="close" />
        </button>
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <BriefingElements elements={level.newElements} />
      </div>
      <form method="dialog" className="shrink-0 px-6 pb-6">
        <button type="submit" className={primaryButtonClassName + ' min-h-12 w-full'}>
          {m.go}
        </button>
      </form>
    </dialog>
  )
}
