import { hexX, hexY } from './hex-art'
import type { Pawn, Tile } from '../lib/engine'
import { FeatureArt } from './features/FeatureArt'
import { Icon, PawnIcon } from './Icon'

export function PawnChip({
  pawn,
  active,
  protectedAlly,
  feature,
}: {
  pawn: Pawn
  active: boolean
  protectedAlly: boolean
  feature?: Tile['feature']
}) {
  const enemy = pawn.side === 'enemy'
  return (
    <g
      data-testid="pawn-chip"
      className="pointer-events-none transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: 'translate(' + hexX(pawn.q, pawn.r) + 'px, ' + hexY(pawn.r) + 'px)' }}
      aria-hidden="true"
    >
      <ellipse cy="17" rx="23" ry="9" fill="#10281e" opacity=".5" />
      {active && (
        <circle
          r="28"
          fill="#ead695"
          fillOpacity=".18"
          stroke="#f2df9e"
          strokeWidth="1.5"
          className="pawn-active-halo"
        />
      )}
      {pawn.escapeChance > 0 && (
        <circle r="25" fill="none" stroke="#b7e5de" strokeWidth="2" strokeDasharray="4 4" />
      )}
      {enemy ? (
        <path
          d="m0-23 20 11v24L0 23-20 12v-24Z"
          fill="url(#enemy-chip)"
          stroke="#d59d81"
          strokeWidth="1.5"
        />
      ) : (
        <circle r="22" fill="url(#player-chip)" stroke="#b2ceaa" strokeWidth="1.5" />
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
        <g data-art="protection-badge" transform="translate(10 -26) scale(.65)" color="#f6e5a6">
          <circle cx="12" cy="12" r="14" fill="#17362b" />
          <Icon name="shield" />
        </g>
      )}
      <rect x="-15" y="24" width="30" height="5" rx="2.5" fill="#17362b" />
      {Array.from({ length: pawn.maxHp }, (_, i) => (
        <rect
          key={i}
          x={-13 + (i * 26) / pawn.maxHp}
          y="25"
          width={26 / pawn.maxHp - 1}
          height="3"
          rx="1"
          fill={i < pawn.hp ? (enemy ? '#db9b7e' : '#d5deb0') : '#47614c'}
        />
      ))}
      {active && <path d="m0-35 4-5h-8Z" fill="#f2df9e" />}
    </g>
  )
}
