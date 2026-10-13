import { memo } from 'react'
import { key, protectorFor, type BattleEffect, type Pawn, type Tile } from '../lib/engine'
import { BattlefieldEffects } from './BattlefieldEffects'
import { PawnChip } from './PawnChip'
import { hexY } from './hex-art'

interface PawnLayerProps {
  viewBox: string
  tiles: Map<string, Tile>
  pawns: Pawn[]
  active?: Pawn
  topRowY: number
  effect: BattleEffect | null
  effectId: number
}

// The floating overlay of pawn chips and combat effects, in one stateless svg.
// Memoized so board-only changes (aiming, inspecting) skip this whole subtree.
export const PawnLayer = memo(function PawnLayer({
  viewBox,
  tiles,
  pawns,
  active,
  topRowY,
  effect,
  effectId,
}: PawnLayerProps) {
  // Pawn moves and combat effects repaint only this composited layer, never
  // the tiles and their drop-shadow.
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 size-full will-change-transform"
      aria-hidden="true"
    >
      {pawns.map((pawn) => (
        <PawnChip
          key={pawn.id}
          pawn={pawn}
          feature={tiles.get(key(pawn.q, pawn.r))?.feature}
          active={active?.id === pawn.id}
          protectedAlly={!!protectorFor(pawns, pawn)}
          topRow={hexY(pawn.r) === topRowY}
        />
      ))}
      <BattlefieldEffects effect={effect} effectId={effectId} />
    </svg>
  )
})
