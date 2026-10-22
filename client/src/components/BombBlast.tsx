import type { Axial } from '../lib/engine'
import { hexX, hexY } from './hex-art'

export function BombBlast() {
  return (
    <g>
      <circle
        r="22"
        className="bomb-blast--shockwave fill-none stroke-current stroke-[5] [transform-box:fill-box] origin-center motion-reduce:animate-none"
      />
      <circle
        r="22"
        className="bomb-blast--shockwave [animation-delay:100ms] fill-none stroke-impact stroke-2 [transform-box:fill-box] origin-center motion-reduce:animate-none"
      />
      <circle
        r="11"
        className="bomb-blast--flash fill-impact [transform-box:fill-box] origin-center motion-reduce:animate-none"
      />
    </g>
  )
}

export function FireballBeam({ from, to }: { from: Axial; to: Axial }) {
  const x1 = hexX(from.q, from.r)
  const y1 = hexY(from.r)
  const x2 = hexX(to.q, to.r)
  const y2 = hexY(to.r)
  const line = (className: string) => (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      pathLength="1"
      className={'battle-trail [stroke-linecap:round] [stroke-dasharray:1] ' + className}
    />
  )
  return (
    <g>
      {line('stroke-current stroke-[13] opacity-25')}
      {line('stroke-current stroke-[6] opacity-50')}
      {line('stroke-impact stroke-[2.5]')}
    </g>
  )
}
