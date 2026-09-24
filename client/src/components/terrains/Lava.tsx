import { hexPoints } from '../hex-art'

export function Lava({ variant }: { variant: number }) {
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
}
