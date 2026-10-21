import { PawnIcon } from './Icon'
import { hexPoints, hexX, hexY } from './hex-art'
import { Forest } from './terrains/Forest'
import { Mountain } from './terrains/Mountain'

const rows = [-2, -1, 0, 1, 2]
const tiles = rows.flatMap((r) =>
  rows.filter((q) => Math.abs(q + r) <= 2).map((q) => ({ q, r })),
)
const units = [
  { q: 0, r: -2, kind: 'king', enemy: true },
  { q: 1, r: -1, kind: 'swordsman', enemy: true },
  { q: -1, r: 1, kind: 'swordsman', enemy: false },
  { q: -1, r: 2, kind: 'king', enemy: false },
  { q: 1, r: 1, kind: 'archer', enemy: false },
] as const

export function HomeBoard() {
  return (
    <svg
      viewBox="-176 -155 352 320"
      aria-hidden="true"
      className="h-[clamp(72px,calc(100dvh-540px),220px)] w-full overflow-visible drop-shadow-[0_18px_18px_#0005] min-[900px]:h-[320px] [@media(max-height:650px)]:h-[clamp(40px,calc(100dvh-450px),140px)] [@media(min-width:600px)_and_(max-height:440px)]:min-h-[180px]"
    >
      <g transform="rotate(-9)">
        {tiles.map(({ q, r }) => (
          <g key={q + ',' + r} transform={'translate(' + hexX(q, r) + ' ' + hexY(r) + ')'}>
            <polygon points={hexPoints} transform="translate(0 6)" className="fill-[#263c31]" />
            <polygon
              points={hexPoints}
              className={
                q === 0 && r === 0
                  ? 'fill-gold'
                  : q === -1 && r === 1
                    ? 'fill-[#adbd84]'
                    : r < 0
                      ? 'fill-[#627c60]'
                      : 'fill-[#7f946d]'
              }
            />
            {((q === -1 && r === -1) || (q === 2 && r === 0)) && <Forest />}
            {q === -2 && r === 1 && <Mountain />}
          </g>
        ))}
        <path
          d={'M' + hexX(-1, 1) + ' 51 Q-38 4 -5 0m-9-6 9 6-9 6'}
          className="fill-none stroke-[#314c39]"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 5"
        />
        {units.map(({ q, r, kind, enemy }) => (
          <g key={q + ',' + r} transform={'translate(' + hexX(q, r) + ' ' + hexY(r) + ')'}>
            <ellipse cy="9" rx="22" ry="19" className="fill-black/20" />
            <circle cy="2" r="21" className={enemy ? 'fill-[#653e32]' : 'fill-[#274939]'} />
            <circle
              cy="-3"
              r="21"
              className={
                enemy ? 'fill-[#bd7054] stroke-[#efb18c]' : 'fill-[#d9e3b5] stroke-[#f0f2d6]'
              }
              strokeWidth="1.5"
            />
            <circle cy="-3" r="16" className="fill-none stroke-black/10" />
            <g
              transform="translate(-12 -15)"
              className={enemy ? 'text-[#fff0d4]' : 'text-[#314c39]'}
            >
              <PawnIcon kind={kind} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  )
}
