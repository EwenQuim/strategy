import { useState } from 'react'
import {
  activePawn,
  rangeTiles,
  threatenedTiles,
  type Axial,
  type GameState,
  type RangeKind,
  type Side,
} from '../lib/engine'

export function useInspection(state: GameState, viewerSide: Side | undefined, local: boolean) {
  const [inspection, setInspection] = useState<{ id: number; range: RangeKind } | null>(null)
  const [peek, setPeek] = useState<RangeKind | null>(null)
  const [threatsShown, setThreatsShown] = useState(false)
  const active = activePawn(state)
  const inspected = state.pawns.find((unit) => unit.id === inspection?.id && unit.hp > 0)
  const shown = inspected ?? active
  const rangeKind = peek ?? inspection?.range ?? 'attack'
  const foeSide =
    viewerSide === 'enemy' || (local && active?.side === 'enemy') ? 'player' : 'enemy'
  const inspect = (id: number) =>
    setInspection(id === inspected?.id ? null : { id, range: 'attack' })
  return {
    inspected,
    shown,
    previewed: inspected ? (inspection?.range ?? null) : null,
    rangeKind,
    range:
      shown && (inspected || peek)
        ? rangeTiles(shown, state.tiles, rangeKind)
        : new Set<string>(),
    threatsShown,
    threats: threatsShown
      ? threatenedTiles(state.tiles, state.pawns, foeSide)
      : new Set<string>(),
    toggleThreats: () => setThreatsShown(!threatsShown),
    inspect,
    inspectAt: (at: Axial) => {
      const occupant = state.pawns.find((unit) => unit.q === at.q && unit.r === at.r)
      if (occupant) inspect(occupant.id)
      else setInspection(null)
    },
    preview: (range: RangeKind) =>
      shown &&
      setInspection(inspected && inspection?.range === range ? null : { id: shown.id, range }),
    peek: setPeek,
    close: () => setInspection(null),
  }
}
