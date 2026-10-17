import { Icon } from './Icon'
import type { BattleEffect, Tile } from '../lib/engine'
import { key, hexDist } from '../lib/engine'
import { SIZE, hexX, hexY } from './hex-art'

export function SupportHalos({
  effect,
  tiles,
  viewBox,
}: {
  effect: BattleEffect | null
  tiles: Map<string, Tile>
  viewBox: string
}) {
  const support = effect?.support
  if (!effect || !support) return null
  const [minX, minY, width, height] = viewBox.split(' ').map(Number)
  const radius = SIZE * 0.95
  const halfWidth = (radius * Math.sqrt(3)) / 2
  return (
    <div
      className="pointer-events-none absolute inset-0 [container-type:size]"
      aria-hidden="true"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: `min(100cqw, calc(100cqh * ${width / height}))`,
          aspectRatio: width / height,
        }}
      >
        {[...tiles.values()]
          .filter((tile) => hexDist(effect.from, tile) <= 1)
          .map((tile) => (
            <div
              key={key(tile.q, tile.r)}
              data-testid="support-halo"
              data-at={key(tile.q, tile.r)}
              data-kind={support.kind}
              className="absolute text-[#b7c9a0] data-[kind=energy]:text-[#d4bb7b]"
              style={{
                left: `${((hexX(tile.q, tile.r) - minX - halfWidth) / width) * 100}%`,
                top: `${((hexY(tile.r) - minY - radius) / height) * 100}%`,
                width: `${((halfWidth * 2) / width) * 100}%`,
                height: `${((radius * 2) / height) * 100}%`,
              }}
            >
              {[
                'left-0 origin-bottom-right skew-y-[30deg]',
                'right-0 origin-bottom-left -skew-y-[30deg]',
              ].map((edge) => (
                <div
                  key={edge}
                  data-testid="support-halo-edge"
                  className={'absolute inset-y-0 w-1/2 ' + edge}
                >
                  <div
                    data-testid="support-halo-light"
                    className="support-halo-rise absolute inset-0 origin-bottom bg-[linear-gradient(to_top,color-mix(in_srgb,currentColor_95%,transparent),color-mix(in_srgb,currentColor_45%,transparent)_12%,color-mix(in_srgb,currentColor_18%,transparent)_45%,transparent_100%)] brightness-125 motion-reduce:animate-none"
                  />
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}

export function SupportFeedback({ effect }: { effect: BattleEffect | null }) {
  const support = effect?.support
  if (!support?.recipients.length) return null
  return (
    <g
      data-testid="combat-support"
      data-kind={support.kind}
      className="pointer-events-none text-[#b7c9a0] data-[kind=energy]:text-[#d4bb7b]"
      aria-hidden="true"
    >
      {support.recipients.map((at) => (
        <g
          key={key(at.q, at.r)}
          data-testid="combat-support-symbol"
          transform={'translate(' + hexX(at.q, at.r) + ' ' + (hexY(at.r) - 30) + ')'}
        >
          <rect
            x="-20"
            y="-10"
            width="40"
            height="20"
            rx="10"
            className="fill-[#162b23] stroke-current stroke-[.8]"
          />
          <text x="-13" y="4" className="fill-current text-[12px] font-bold">
            +1
          </text>
          <g transform="translate(4 -5.5) scale(.46)">
            <Icon name={support.kind === 'heal' ? 'heart' : 'energy'} />
          </g>
        </g>
      ))}
    </g>
  )
}
