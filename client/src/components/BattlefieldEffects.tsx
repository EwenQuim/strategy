import type { BattleEffect } from '../lib/engine'
import { key } from '../lib/engine'
import { hexX, hexY } from './hex-art'
import { PawnIcon } from './Icon'

export function BattlefieldEffects({
  effect,
  effectId,
}: {
  effect: BattleEffect | null
  effectId: number
}) {
  return (
    <>
      {effect && (
        <g
          key={effectId}
          className="battle-effect pointer-events-none text-[#ffd4a1] data-[kind=move]:text-[#ead695] data-[kind=rally]:text-[#b7e5c8] data-[kind=escape]:text-[#b7e5c8] data-[kind=fireball]:text-[#ffab78] data-[kind=bomb]:text-[#ffab78] data-[kind=hellfire]:text-[var(--hellfire-impact,#ff805e)] motion-reduce:animate-none"
          data-kind={effect.kind}
          aria-hidden="true"
        >
          {effect.kind !== 'escape' &&
            effect.kind !== 'rally' &&
            effect.kind !== 'hellfire' && (
              <line
                x1={hexX(effect.from.q, effect.from.r)}
                y1={hexY(effect.from.r)}
                x2={hexX(effect.to.q, effect.to.r)}
                y2={hexY(effect.to.r)}
                pathLength="1"
                className={
                  'battle-trail stroke-current [stroke-linecap:round] [stroke-dasharray:1] ' +
                  (effect.kind === 'move' ? 'stroke-2' : 'stroke-[4]')
                }
              />
            )}
          {(effect.kind === 'bomb' || effect.kind === 'hellfire') &&
            (effect.kind === 'hellfire' ? (effect.centers ?? [effect.to]) : [effect.to]).map(
              (center) => (
                <g
                  key={key(center.q, center.r)}
                  data-testid={effect.kind === 'hellfire' ? 'hellfire-effect' : 'bomb-effect'}
                  transform={
                    'translate(' + hexX(center.q, center.r) + ' ' + hexY(center.r) + ')'
                  }
                >
                  <circle
                    r="66"
                    className="battle-impact origin-center fill-current stroke-current stroke-2 [fill-opacity:0.18] [transform-box:fill-box] motion-reduce:animate-none"
                  />
                  {effect.kind === 'hellfire' ? (
                    <g className="hellfire-flame motion-reduce:animate-none">
                      <path
                        d="M0-30C9-16 21-9 21 5a21 21 0 0 1-42 0c0-9 5-16 11-21-1 9 3 12 5 12C-1-9 3-18 0-30Z"
                        fill="currentColor"
                      />
                      <path
                        d="M1-9C8 0 11 4 11 9a11 11 0 0 1-22 0c0-6 7-10 12-18Z"
                        fill="#ffe1a3"
                      />
                    </g>
                  ) : (
                    <g transform="translate(-22 -30) scale(2)" className="text-[#ffe1a3]">
                      <circle cx="11" cy="15" r="7" className="fill-[#25252d]" />
                      <PawnIcon kind="bomber" />
                    </g>
                  )}
                </g>
              ),
            )}
          {effect.kind !== 'bomb' && effect.kind !== 'hellfire' && !effect.impacts?.length && (
            <g
              transform={
                'translate(' + hexX(effect.to.q, effect.to.r) + ' ' + hexY(effect.to.r) + ')'
              }
            >
              <circle
                r={effect.kind === 'fireball' || effect.kind === 'rally' ? 66 : 29}
                className="battle-impact origin-center fill-current stroke-current stroke-2 [fill-opacity:0.18] [transform-box:fill-box]"
              />
            </g>
          )}
        </g>
      )}
      {!!effect?.impacts?.length && (
        <g
          key={'impacts-' + effectId}
          className="pointer-events-none"
          data-testid="combat-impacts"
          aria-hidden="true"
        >
          {effect.impacts.map((hit) => (
            <g
              key={key(hit.q, hit.r)}
              transform={'translate(' + hexX(hit.q, hit.r) + ' ' + hexY(hit.r) + ')'}
            >
              <g className={hit.damage > 0 ? 'text-[#ffe1a3]' : 'text-[#c9eaf4]'}>
                <circle
                  r="28"
                  className={
                    'combat-impact-burst origin-center fill-none stroke-current stroke-[3] [transform-box:fill-box] motion-reduce:hidden' +
                    (hit.damage > 0 ? '' : ' [stroke-dasharray:4_7]')
                  }
                />
                {hit.damage > 0 && (
                  <path
                    className="combat-impact-burst origin-center fill-none stroke-current stroke-[3] [transform-box:fill-box] motion-reduce:hidden"
                    d="M0-34v-8M24-24l6-6M34 0h8M24 24l6 6M0 34v8M-24 24l-6 6M-34 0h-8M-24-24l-6-6"
                  />
                )}
                <text
                  y="8"
                  textAnchor="middle"
                  className={
                    'combat-impact-label fill-current stroke-[#14271f] stroke-[5] font-black [paint-order:stroke] ' +
                    (hit.damage > 0 ? 'text-3xl' : 'combat-impact-label--miss text-2xl italic')
                  }
                >
                  {hit.damage > 0 ? '-' + hit.damage : 'MISS'}
                </text>
              </g>
            </g>
          ))}
        </g>
      )}
    </>
  )
}
