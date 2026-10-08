import { Icon, PawnIcon, type IconName } from './Icon'
import { hexPoints, terrainColors } from './hex-art'
import { TerrainArt } from './terrains/TerrainArt'
import { FeatureArt } from './features/FeatureArt'
import type { IntroducedElement } from '../lib/campaign'
import { ELEMENT_ACCENTS, type BriefingElement } from '../briefings'
import { PAWN_CLASSES, TILE_FEATURES, type PawnKind, type TileFeature } from '../lib/engine'

const isPawn = (art: IntroducedElement): art is PawnKind => art in PAWN_CLASSES
const isFeature = (art: IntroducedElement): art is TileFeature =>
  TILE_FEATURES.includes(art as TileFeature)

export function ElementArt({
  art,
  index,
  hero = false,
}: {
  art: IntroducedElement
  index: number
  hero?: boolean
}) {
  const accent = ELEMENT_ACCENTS[art] ?? 'var(--gold)'
  const delay = index * 120 + 'ms'

  return (
    <div
      className={
        hero
          ? 'relative size-[164px] shrink-0 max-[360px]:size-[136px] [@media(max-height:650px)]:size-[112px]'
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
