import { hexDist } from './hex.ts'
import { SeededRandom } from './random.ts'
import type { Axial, GameState } from './types.ts'

export const inHellfire = (centers: readonly Axial[], at: Axial): boolean =>
  centers.some((center) => hexDist(center, at) <= 1)

export function markHellfire(state: GameState): Pick<GameState, 'hellfire' | 'randomState'> {
  if (state.biome !== 'hell') return { hellfire: [], randomState: state.randomState }
  const random = new SeededRandom(state.randomState)
  const count = state.setup?.map !== undefined ? (state.setup.hellfireCount ?? 2) : 2
  const sides = count === 1 ? [state.round % 2 ? 'player' : 'enemy'] : ['player', 'enemy']
  const hellfire = sides.flatMap((side) => {
    const army = state.pawns.filter((pawn) => pawn.side === side)
    if (!army.length) return []
    const { q, r } = army[Math.floor(random.next() * army.length)]
    return [{ q, r }]
  })
  return { hellfire, randomState: random.state }
}
