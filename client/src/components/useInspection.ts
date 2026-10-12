import { useState } from 'react'
import {
  activePawn,
  rangeTiles,
  threatenedTiles,
  type Axial,
  type GameState,
  type Side,
} from '../lib/engine'

export function useInspection(state: GameState, viewerSide: Side | undefined, local: boolean) {
  const [inspection, setInspection] = useState<number | null>(null)
  const [peek, setPeek] = useState(false)
  const [threatsShown, setThreatsShown] = useState(false)
  const active = activePawn(state)
  const inspected = state.pawns.find((unit) => unit.id === inspection && unit.hp > 0)
  const shown = inspected ?? active
  const foeSide =
    viewerSide === 'enemy' || (local && active?.side === 'enemy') ? 'player' : 'enemy'
  const inspect = (id: number) => setInspection(id === inspected?.id ? null : id)
  // React Compiler memoizes this board calculation across UI-only renders.
  const threats = threatsShown
    ? threatenedTiles(state.tiles, state.pawns, foeSide)
    : new Set<string>()
  return {
    inspected,
    shown,
    previewed: !!inspected,
    range: shown && (inspected || peek) ? rangeTiles(shown, state.tiles) : new Set<string>(),
    threatsShown,
    threats,
    toggleThreats: () => setThreatsShown(!threatsShown),
    inspect,
    inspectAt: (at: Axial) => {
      const occupant = state.pawns.find((unit) => unit.q === at.q && unit.r === at.r)
      if (occupant) inspect(occupant.id)
      else setInspection(null)
    },
    preview: () => shown && inspect(shown.id),
    peek: setPeek,
    close: () => setInspection(null),
  }
}
