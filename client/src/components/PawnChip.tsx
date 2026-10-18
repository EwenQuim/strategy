import { hexX, hexY } from './hex-art'
import * as m from '../i18n/combat'
import type { Pawn, Tile } from '../lib/engine'
import { FeatureArt } from './features/FeatureArt'
import { Icon, PawnIcon } from './Icon'

export function PawnChip({
  pawn,
  active,
  dimmed,
  protectedAlly,
  feature,
  topRow,
}: {
  pawn: Pawn
  active: boolean
  dimmed: boolean
  protectedAlly: boolean
  feature?: Tile['feature']
  topRow: boolean
}) {
  const enemy = pawn.side === 'enemy'
  return (
    <g
      data-testid="pawn-chip"
      data-pawn={pawn.id}
      className="pointer-events-none transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: 'translate(' + hexX(pawn.q, pawn.r) + 'px, ' + hexY(pawn.r) + 'px)' }}
      opacity={dimmed ? 0.9 : undefined}
      aria-hidden="true"
    >
      <g
        data-fallen={pawn.hp <= 0 || undefined}
        transform={active ? 'scale(1.15)' : undefined}
        className={
          pawn.hp <= 0
            ? 'pawn-fall motion-reduce:animate-none motion-reduce:opacity-40'
            : undefined
        }
      >
        <ellipse cy="17" rx="23" ry="9" fill="#10281e" opacity=".5" />
        {active && (
          <g data-art="active-halo" className="active-halo-pop motion-reduce:animate-none">
            <circle r="46" fill="url(#active-halo)" />
          </g>
        )}
        {enemy ? (
          <path
            d="m0-23 20 11v24L0 23-20 12v-24Z"
            fill="url(#enemy-chip)"
            stroke={active ? '#ffe9a8' : '#d59d81'}
            strokeWidth={active ? 2.5 : 1.5}
          />
        ) : (
          <circle
            r="22"
            fill="url(#player-chip)"
            stroke={active ? '#ffe9a8' : '#b2ceaa'}
            strokeWidth={active ? 2.5 : 1.5}
          />
        )}
        <circle r="17.5" fill="none" stroke="#f5e5bf" strokeOpacity=".15" />
        <g transform="translate(-12 -15)" color={pawn.kind === 'king' ? '#f0d38e' : '#f1e8d2'}>
          <PawnIcon kind={pawn.kind} />
        </g>
        <text y="13" textAnchor="middle" fontSize="8" fontWeight="600" fill="#e9e5ce">
          {pawn.id.toString().padStart(2, '0')}
        </text>
        {feature && (
          <g data-art="feature-badge" transform="translate(-20 -19) scale(.43)">
            <circle r="28" fill="#24342e" stroke="#dec89a" strokeWidth="2" />
            <FeatureArt feature={feature} />
          </g>
        )}
        {protectedAlly && (
          <g
            data-art="protection-badge"
            transform="translate(10 -26) scale(.65)"
            color="#f6e5a6"
          >
            <circle cx="12" cy="12" r="14" fill="#17362b" />
            <Icon name="shield" />
          </g>
        )}
        <rect x="-15" y="24" width="30" height="5" rx="2.5" fill="#17362b" />
        {Array.from({ length: pawn.maxHp }, (_, i) => (
          <rect
            key={i}
            data-kind="hp"
            data-filled={i < pawn.hp}
            x={-13 + (i * 26) / pawn.maxHp}
            y="25"
            width={26 / pawn.maxHp - 1}
            height="3"
            rx="1"
            fill={i < pawn.hp ? (enemy ? '#db9b7e' : '#d5deb0') : '#47614c'}
          />
        ))}
        {(active || pawn.bonusEnergy > 0) && (
          <g opacity={active ? 1 : 0.5}>
            <rect
              x={-(pawn.maxEnergy * 7 + 6) / 2}
              y="30"
              width={pawn.maxEnergy * 7 + 6}
              height="7"
              rx="3.5"
              fill="#17362b"
            />
            {Array.from({ length: pawn.maxEnergy }, (_, i) => (
              <path
                key={'energy-' + i}
                data-kind="energy"
                data-filled={i < pawn.energy}
                d="M0-2.6 2.6 0 0 2.6-2.6 0Z"
                transform={'translate(' + (-((pawn.maxEnergy - 1) * 3.5) + i * 7) + ' 33.5)'}
                className="transition-[fill] duration-300 motion-reduce:transition-none"
                fill={i < pawn.energy ? '#ffdf9e' : '#41584b'}
              />
            ))}
          </g>
        )}
        {active && <path d="m0-35 4-5h-8Z" fill="#ffe9a8" />}
      </g>
      {pawn.hp <= 0 && (
        <text
          data-testid="killed-message"
          y={topRow ? 48 : -28}
          textAnchor="middle"
          className="combat-impact-label combat-impact-label--drift fill-[#ff8d75] stroke-[#14271f] stroke-[5] text-[24px] font-black italic uppercase [paint-order:stroke] motion-reduce:animate-none"
        >
          {m.killed}
        </text>
      )}
    </g>
  )
}
