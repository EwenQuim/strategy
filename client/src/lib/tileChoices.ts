import {
  activePawn,
  hexDist,
  key,
  pawnAt,
  sameHex,
  specialTargets,
  targetingTiles,
  walkingPaths,
  type Action,
  type Aim,
  type Axial,
  type GameState,
} from './engine/index.ts'

export type TileChoice =
  | { kind: 'landing'; nextAim: Aim }
  // An enemy a move-and-attack can reach from a landing the player has not chosen yet.
  | { kind: 'pounce'; target: Axial }
  | { kind: 'move' | 'attack'; action: Action }

export type Targeting = 'strike' | 'charge' | 'jump' | 'special'

export function tileChoices(state: GameState, aim: Aim): Map<string, TileChoice> {
  const pawn = activePawn(state)
  const choices = new Map<string, TileChoice>()
  if (!pawn || state.winner) return choices
  const targets = targetingTiles(state, aim)
  const choosingLanding = pawn.special.choosesDestination && !aim.destination
  for (const position of targets) {
    const tile = state.tiles.get(position)!
    const at = { q: tile.q, r: tile.r }
    if (choosingLanding) {
      const nextAim: Aim = { action: 'special', destination: at }
      choices.set(
        position,
        pawn.special.targetOptional && !targetingTiles(state, nextAim).size
          ? { kind: 'move', action: { type: 'special', destination: at } }
          : { kind: 'landing', nextAim },
      )
    } else {
      const occupant = pawnAt(state.pawns, at)
      choices.set(position, {
        kind:
          aim.destination ||
          ((pawn.special.damage ?? pawn.attack.damage) > 0 &&
            (pawn.special.areaTargets || (occupant && occupant.side !== pawn.side)))
            ? 'attack'
            : 'move',
        action: {
          type: 'special',
          target: at,
          ...(aim.destination ? { destination: aim.destination } : {}),
        },
      })
    }
  }
  if (choosingLanding && targets.has(key(pawn.q, pawn.r))) {
    const destination = { q: pawn.q, r: pawn.r }
    for (const position of targetingTiles(state, { action: 'special', destination })) {
      const tile = state.tiles.get(position)!
      choices.set(position, {
        kind: 'attack',
        action: { type: 'special', target: { q: tile.q, r: tile.r }, destination },
      })
    }
  }
  // A move-and-attack also threatens enemies beyond the chosen landings: striking
  // from where the pawn stands already has its choice, every other reachable
  // enemy becomes a strike target whose landing the tap resolves.
  if (choosingLanding)
    for (const position of targets) {
      const tile = state.tiles.get(position)!
      for (const enemy of specialTargets(state.pawns, pawn, tile)) {
        const at = key(enemy.q, enemy.r)
        if (!choices.has(at))
          choices.set(at, { kind: 'pounce', target: { q: enemy.q, r: enemy.r } })
      }
    }
  return choices
}

// Tapping a pounce enemy strikes from a landing the player never picked: several
// may reach it, so chance decides between the nearest two, and a single candidate
// is the landing.
export function pounceLanding(state: GameState, target: Axial): Axial | null {
  const pawn = activePawn(state)
  if (!pawn || !pawn.special.choosesDestination) return null
  const routes =
    pawn.special.movement === 'walk'
      ? walkingPaths(state.tiles, state.pawns, pawn, pawn.special.landingRange)
      : null
  const landings = [...targetingTiles(state, { action: 'special' })]
    .map((position) => state.tiles.get(position)!)
    .filter((tile) =>
      specialTargets(state.pawns, pawn, tile).some((enemy) => sameHex(enemy, target)),
    )
    .map((tile) => ({
      tile,
      distance: routes
        ? (routes.get(key(tile.q, tile.r))?.steps ?? Infinity)
        : hexDist(pawn, tile),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)
  const picked = landings[Math.floor(Math.random() * landings.length)]
  return picked ? { q: picked.tile.q, r: picked.tile.r } : null
}
