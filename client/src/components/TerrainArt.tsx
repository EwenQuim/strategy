import { hexPoints } from './hex-art'
import type { Tile } from '../lib/engine'

export function TerrainArt({
  terrain,
  variant,
}: {
  terrain: Tile['terrain']
  variant: number
}) {
  if (terrain === 'lava')
    return (
      <g className="pointer-events-none" data-art="lava">
        <g clipPath="url(#lava-hex)">
          <polygon points={hexPoints} fill="url(#lava-glow)" />
          <g transform={'rotate(' + variant * 120 + ') scale(1.4)'}>
            <path
              d="M-29 4C-14-10-7 12 7 2S21-8 30-2M-15 21C-7 13-2 14 3 8"
              fill="none"
              stroke="#d7a674"
              strokeWidth="2.5"
              opacity=".42"
            />
            <path
              d="M-18 6Q-10 3-4 6T7 3"
              fill="none"
              stroke="#e0b47f"
              strokeWidth="1"
              opacity=".6"
            />
            <ellipse
              cx="4"
              cy="-8"
              rx="2.7"
              ry="1.5"
              fill="none"
              stroke="#d2a376"
              strokeWidth=".8"
              opacity=".6"
            />
            <ellipse cx="-8" cy="11" rx="1.6" ry=".9" fill="#d6ab7d" opacity=".5" />
          </g>
        </g>
      </g>
    )
  if (terrain === 'basalt')
    return (
      <g
        className="pointer-events-none"
        data-art="basalt"
        transform={'rotate(' + variant * 120 + ')'}
      >
        <path
          d="m-23-7 14-11 15 5 12 12-15 5-15-3Z"
          fill="var(--basalt-light, #75666b)"
          opacity=".18"
        />
        <path
          d="m-20 9 10-6 16 4 13 9-15 6-16-5Z"
          fill="var(--basalt-shadow, #433b42)"
          opacity=".18"
        />
        <path
          d="m-21-7 12 3 9-4 14 7M0-8l4-9"
          fill="none"
          stroke="var(--basalt-crack, #40373e)"
          strokeWidth=".8"
          opacity=".4"
        />
        <path
          d="m-19-8 10 3M-7 14l8 2"
          fill="none"
          stroke="var(--basalt-edge, #9a8388)"
          strokeWidth=".7"
          opacity=".22"
        />
        <ellipse
          cx="12"
          cy="10"
          rx="3.5"
          ry="1.8"
          fill="var(--basalt-stone, #6c5c62)"
          opacity=".65"
        />
        <ellipse
          cx="-12"
          cy="12"
          rx="1.5"
          ry=".8"
          fill="var(--basalt-speck, #a28b88)"
          opacity=".25"
        />
      </g>
    )
  if (terrain === 'palm')
    return (
      <g className="pointer-events-none" data-art="palm">
        <ellipse cy="17" rx="19" ry="5" fill="#886039" opacity=".25" />
        <path d="M2 18Q-6 5 0-10" fill="none" stroke="#86603c" strokeWidth="5" />
        <path
          d="M0-10Q-18-23-23-6q12-7 23-4M0-10Q-4-30 11-24L0-10M0-10Q18-22 24-6q-12-7-24-4M0-10Q-15-5-13 7L0-10M0-10Q14-8 15 6Z"
          fill="#4f7751"
        />
        <path d="M0-10-17-12M0-10 18-12M0-10 7-23" stroke="#96a467" strokeWidth="1.4" />
        <circle cy="-8" r="2.5" fill="#bc864c" />
      </g>
    )
  if (terrain === 'sand')
    return (
      <g
        className="pointer-events-none"
        data-art="sand"
        transform={'translate(0 ' + (variant * 3 - 3) + ')'}
      >
        <path
          d="M-22 8Q-4-10 8-2T22 6"
          fill="none"
          stroke="#e6c081"
          strokeOpacity=".28"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="m-16 16q13-6 30-1"
          fill="none"
          stroke="#8b5c30"
          strokeOpacity=".22"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
    )
  if (terrain === 'lake')
    return (
      <g className="pointer-events-none">
        <path
          d="m-16-4q6-5 12 0t12 0 12 0"
          fill="none"
          stroke="#bfe0ea"
          strokeOpacity=".5"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="m-12 6q6-5 12 0t12 0"
          fill="none"
          stroke="#bfe0ea"
          strokeOpacity=".3"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    )
  if (terrain === 'mountain')
    return (
      <g className="pointer-events-none">
        <ellipse cy="15" rx="20" ry="5" fill="var(--mountain-shadow, #263c2e)" opacity=".25" />
        <path d="m-23 15 13-23 13 23Z" fill="var(--mountain-back, #8f9980)" />
        <path d="m-10-8 13 23h-13Z" fill="var(--mountain-back-shade, #576651)" />
        <path d="m-10 17 16-36 19 36Z" fill="var(--mountain-front, #b2b69a)" />
        <path d="M6-19 25 17H6Z" fill="var(--mountain-front-shade, #7d8b70)" />
        <path d="m6-19-6 14 6-3 7 3Z" fill="var(--mountain-peak, #dedec0)" />
      </g>
    )
  if (terrain === 'forest')
    return (
      <g className="pointer-events-none">
        <ellipse cy="16" rx="21" ry="6" fill="#1b3429" opacity=".3" />
        {[-12, 11, 0].map((x, i) => (
          <g key={x} transform={'translate(' + x + ' ' + (i === 2 ? 2 : -4) + ')'}>
            <path d="M0 7v10" stroke="#c2b085" strokeWidth="2" />
            <path d="m0-18-10 15h4l-8 13h28L6-3h4Z" fill={i === 2 ? '#344f39' : '#3d5b40'} />
            <path d="M0-18V10h14L6-3h4Z" fill="#254332" opacity=".7" />
            <path d="m0-18-10 15h4l-8 13" fill="none" stroke="#9baf79" strokeOpacity=".4" />
          </g>
        ))}
      </g>
    )
  return (
    <g
      className="pointer-events-none"
      opacity=".48"
      transform={'translate(' + (variant * 4 - 4) + ' ' + (variant * 3 - 5) + ')'}
    >
      <path
        d="m-8 5-3-5m3 5 1-8m0 8 4-3m11 8-2-6m2 6 3-4"
        fill="none"
        stroke="#d0d4a4"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <ellipse cx="11" cy="-8" rx="2.5" ry="1.4" fill="#4a6446" />
      <circle cx="-15" cy="13" r="1.2" fill="#d2c391" />
    </g>
  )
}
