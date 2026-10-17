import { useState } from 'react'
import { activePawn, pawnAt, rangeTiles, type Axial, type GameState } from '../lib/engine'

export function useInspection(state: GameState, locked = false) {
  const [inspection, setInspection] = useState<number | null>(null)
  const [peek, setPeek] = useState(false)
  const active = activePawn(state)
  const inspected = state.pawns.find((unit) => unit.id === inspection && unit.hp > 0)
  const shown = inspected ?? active
  // While locked (an attack is aimed and its targets displayed), no unit can be inspected.
  const inspect = (id: number) => {
    if (locked) return
    setInspection(id === inspected?.id ? null : id)
  }
  return {
    inspected,
    shown,
    previewed: !!inspected,
    range: shown && (inspected || peek) ? rangeTiles(shown, state.tiles) : new Set<string>(),
    inspect,
    inspectAt: (at: Axial) => {
      const occupant = pawnAt(state.pawns, at)
      if (occupant) inspect(occupant.id)
      else setInspection(null)
    },
    preview: () => shown && inspect(shown.id),
    peek: setPeek,
    close: () => setInspection(null),
  }
}
