import type { TileFeature } from '../../lib/engine'
import { Rune } from './Rune'
import { Spring } from './Spring'
import { Watchtower } from './Watchtower'

const featureArt = { watchtower: Watchtower, spring: Spring, rune: Rune }

export function FeatureArt({ feature }: { feature: TileFeature }) {
  const Art = featureArt[feature]
  return (
    <g className="pointer-events-none" data-art="feature" data-feature-art={feature}>
      <Art />
    </g>
  )
}
