import type { Terrain } from '../hex.ts'

export type Shape = [number, number][]

export type MapFeature = {
  terrain: Terrain
  min: number
  max: number
  shapes: Shape[]
}

export type BiomeDefinition = {
  readonly ground: Terrain
  readonly scatter?: { readonly terrain: Terrain; readonly chance: number }
  readonly features: readonly MapFeature[]
  readonly theme: Readonly<Record<`--${string}`, string>>
}

export const lineShape = (length: number): Shape =>
  Array.from({ length }, (_, i) => [i, 0] as [number, number])

export const bendShape = (first: number, second: number): Shape => [
  ...lineShape(first),
  ...lineShape(second - 1).map(([q]) => [first - 1, q + 1] as [number, number]),
]

export const poolShapes: Shape[] = [
  [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, -1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, -1],
    [-1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, -1],
    [-1, 1],
    [-1, 2],
  ],
]
