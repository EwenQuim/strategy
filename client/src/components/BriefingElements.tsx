import { Icon, PawnIcon, type IconName } from './Icon'
import { hexPoints, terrainPalette } from './hex-art'
import { TerrainArt } from './terrains/TerrainArt'
import { FeatureArt } from './features/FeatureArt'
import type { IntroducedElement } from '../campaign'
import { ELEMENT_ACCENTS } from '../briefings'
import { PAWN_CLASSES, TILE_FEATURES, type PawnKind, type TileFeature } from '../lib/engine'

const isPawn = (art: IntroducedElement): art is PawnKind => art in PAWN_CLASSES
const isFeature = (art: IntroducedElement): art is TileFeature =>
  TILE_FEATURES.includes(art as TileFeature)

export function ElementArt({
  art,
  index,
  hero = false,
  small = false,
}: {
  art: IntroducedElement
  index: number
  hero?: boolean
  small?: boolean
}) {
  const accent = ELEMENT_ACCENTS[art] ?? 'var(--gold)'
  const delay = index * 120 + 'ms'

  return (
    <div
      className={
        hero
          ? 'relative size-[164px] shrink-0 max-[360px]:size-[136px] [@media(max-height:650px)]:size-[112px]'
          : small
            ? 'relative size-[44px] shrink-0 max-[360px]:size-[40px]'
            : 'relative size-[76px] shrink-0 max-[360px]:size-[64px]'
      }
      style={{ animationDelay: delay }}
    >
      <div
        className="briefing-art-glow absolute -inset-2 rounded-full motion-reduce:animate-none"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 22%, transparent) 0%, transparent 65%)`,
          animationDelay: delay,
        }}
      />
      <svg
        className="briefing-art-icon relative size-full drop-shadow-art-soft motion-reduce:animate-none"
        viewBox="-38 -38 76 76"
        aria-hidden="true"
        style={{ animationDelay: delay }}
      >
        {isPawn(art) ? (
          <>
            <polygon points={hexPoints} fill="var(--tile-base)" />
            <polygon
              points={hexPoints}
              fill="none"
              stroke={accent}
              strokeOpacity=".2"
              strokeWidth="1"
              transform="scale(1.1)"
            />
            <circle
              r="22"
              fill="url(#player-chip)"
              stroke="var(--pawn-stroke)"
              strokeWidth="1.5"
            />
            <circle r="17.5" fill="none" stroke="var(--pawn-ring)" strokeOpacity=".12" />
            <g
              transform="translate(-12 -12)"
              color={art === 'king' ? 'var(--pawn-king)' : 'var(--pawn-icon)'}
            >
              <PawnIcon kind={art} />
            </g>
          </>
        ) : isFeature(art) ? (
          <>
            <polygon points={hexPoints} fill={terrainPalette.plain} />
            <FeatureArt feature={art} />
          </>
        ) : art === 'archipel' ? (
          <>
            <polygon points={hexPoints} fill={terrainColors.shoal} />
            <TerrainArt terrain="shoal" variant={0} />
          </>
        ) : art === 'hell' ? (
          <>
            <polygon points={hexPoints} fill={terrainPalette.basalt} />
            <polygon points={hexPoints} fill="url(#hellfire-hatch)" />
          </>
        ) : (
          <>
            <polygon points={hexPoints} fill={terrainPalette[art]} />
            <TerrainArt terrain={art} variant={0} />
          </>
        )}
      </svg>
    </div>
  )
}

export function StatChip({
  icon,
  value,
  color,
}: {
  icon: IconName
  value: string | number
  color: string
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-soft px-1.5 py-0.5 text-[12px] font-semibold leading-none text-ink">
      <Icon name={icon} className={'size-[11px] ' + color} />
      {value}
    </span>
  )
}
