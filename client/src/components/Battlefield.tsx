import * as m from '../i18n/game'
import type { TileChoice, Targeting } from '../lib/tileChoices'
import type { Axial, BattleEffect, Pawn, Tile } from '../lib/engine'
import { SupportHalos } from './SupportFeedback'
import { TileLayer } from './TileLayer'
import { PawnLayer } from './PawnLayer'
import { SIZE, hexX, hexY } from './hex-art'
import type { PlayerNames } from '../lib/game-mode'

interface BattlefieldProps {
  labels: PlayerNames
  tiles: Map<string, Tile>
  pawns: Pawn[]
  hellfire: readonly Axial[]
  active?: Pawn
  reach: Map<string, number>
  targets: Map<string, TileChoice>
  targetLabel: string
  targeting: Targeting
  preview: Axial | null
  rechoose?: Axial | null
  range: Set<string>
  threats: Set<string>
  effect: BattleEffect | null
  effectId: number
  onTileClick: (tile: Tile) => void
  onInspect: (tile: Tile) => void
}

// Stacks the board from bottom to top: tiles, support halos, then the floating
// pawn layer. Each svg is its own stateless component, and the compiler caches
// their call sites, so a render that only changes one layer skips the others.
export function Battlefield({
  labels,
  tiles,
  pawns,
  hellfire,
  active,
  reach,
  targets,
  targetLabel,
  targeting,
  preview,
  rechoose,
  range,
  threats,
  effect,
  effectId,
  onTileClick,
  onInspect,
}: BattlefieldProps) {
  const allTiles = [...tiles.values()]
  const xs = allTiles.map((t) => hexX(t.q, t.r))
  const ys = allTiles.map((t) => hexY(t.r))
  const pad = SIZE * 1.35
  const [minX, minY] = [Math.min(...xs) - pad, Math.min(...ys) - pad]
  const viewBox = [minX, minY, Math.max(...xs) - minX + pad, Math.max(...ys) - minY + pad].join(
    ' ',
  )
  const shake = !!effect?.impacts?.some((hit) => hit.damage > 0)

  return (
    <div
      className={
        'relative size-full max-w-[860px] touch-manipulation select-none motion-reduce:animate-none' +
        // Alternating keyframe names restart the shake on consecutive hits.
        (shake
          ? effectId % 2
            ? ' battlefield-shake'
            : ' battlefield-shake battlefield-shake--alt'
          : '')
      }
      data-testid="battlefield"
      role="group"
      aria-label={m.battlefieldHint}
    >
      <TileLayer
        viewBox={viewBox}
        tiles={tiles}
        pawns={pawns}
        hellfire={hellfire}
        labels={labels}
        active={active}
        reach={reach}
        targets={targets}
        targetLabel={targetLabel}
        targeting={targeting}
        preview={preview}
        rechoose={rechoose}
        range={range}
        threats={threats}
        onTileClick={onTileClick}
        onInspect={onInspect}
      />
      <SupportHalos key={'halos-' + effectId} effect={effect} tiles={tiles} viewBox={viewBox} />
      <PawnLayer
        viewBox={viewBox}
        tiles={tiles}
        pawns={pawns}
        active={active}
        topRowY={minY + pad}
        effect={effect}
        effectId={effectId}
      />
    </div>
  )
}
