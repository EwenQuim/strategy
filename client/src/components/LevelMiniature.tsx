import { hexOf, mapFromRows, type FixedBattleSetup } from '../lib/engine'
import { SIZE, hexPoints, hexX, hexY, terrainColors } from './hex-art'

const colors = { ...terrainColors, lava: '#d0643c' }
const armyColors = { player: '#dfeccf', enemy: '#f09a78' }

export function LevelMiniature({ setup }: { setup: FixedBattleSetup }) {
  const tiles = [...mapFromRows(setup.map).values()]
  const xs = tiles.map((tile) => hexX(tile.q, tile.r))
  const ys = tiles.map((tile) => hexY(tile.r))
  const minX = Math.min(...xs) - SIZE
  const minY = Math.min(...ys) - SIZE
  const viewBox = [minX, minY, Math.max(...xs) + SIZE - minX, Math.max(...ys) + SIZE - minY]
  return (
    <svg viewBox={viewBox.join(' ')} className="min-h-0 w-full flex-1" aria-hidden="true">
      {tiles.map((tile) => (
        <g
          key={tile.q + ',' + tile.r}
          transform={`translate(${hexX(tile.q, tile.r)} ${hexY(tile.r)})`}
        >
          <polygon points={hexPoints} fill={colors[tile.terrain]} />
          {tile.feature && <circle r={SIZE * 0.4} fill="var(--gold)" />}
        </g>
      ))}
      {(['player', 'enemy'] as const).flatMap((side) =>
        setup[side].map(({ col, row }) => {
          const { q, r } = hexOf(col, row)
          return (
            <circle
              key={side + col + ',' + row}
              cx={hexX(q, r)}
              cy={hexY(r)}
              r={SIZE * 0.45}
              fill={armyColors[side]}
            />
          )
        }),
      )}
    </svg>
  )
}
