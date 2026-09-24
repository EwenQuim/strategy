import type { ReactElement } from 'react'
import type { Terrain } from '../../lib/engine'
import { Basalt } from './Basalt'
import { Forest } from './Forest'
import { Lake } from './Lake'
import { Lava } from './Lava'
import { Mountain } from './Mountain'
import { Palm } from './Palm'
import { Plain } from './Plain'
import { Sand } from './Sand'

const terrainArt: Record<Terrain, (props: { variant: number }) => ReactElement> = {
  lava: Lava,
  basalt: Basalt,
  palm: Palm,
  sand: Sand,
  lake: Lake,
  mountain: Mountain,
  forest: Forest,
  plain: Plain,
}

export function TerrainArt({ terrain, variant }: { terrain: Terrain; variant: number }) {
  const Art = terrainArt[terrain]
  return <Art variant={variant} />
}
