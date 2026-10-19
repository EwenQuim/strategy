import { key } from './hex.ts'
import { inHellfire, markHellfire } from './hellfire.ts'
import type { Pawn, Side } from './pawns/index.ts'
import type { BattleEffect, BattleFrame, GameState } from './engine.ts'

export function winnerFrom(pawns: Pawn[], actingSide: Side): Side | null {
  const playerKing = pawns.some((p) => p.kind === 'king' && p.side === 'player')
  const enemyKing = pawns.some((p) => p.kind === 'king' && p.side === 'enemy')
  if (playerKing && enemyKing) return null
  if (playerKing) return 'player'
  if (enemyKing) return 'enemy'
  // Both crowns fell in the same blow: the side that struck last wins.
  return actingSide === 'player' ? 'enemy' : 'player'
}

export function endBattle(
  state: GameState,
  winner: NonNullable<GameState['winner']>,
): GameState {
  return { ...state, winner }
}

export function advanceTurn(
  state: GameState,
  record?: (frame: BattleFrame) => void,
): GameState {
  let { pawns, hellfire, randomState } = state
  let { order, round, blows } = state
  let active = state.active + 1
  while (true) {
    if (active >= order.length) {
      if (hellfire.length) {
        const impacts = pawns
          .filter((pawn) => inHellfire(hellfire, pawn))
          .map((pawn) => {
            pawn.hp--
            return { q: pawn.q, r: pawn.r, damage: 1 }
          })
        const fallen = pawns
          .filter((pawn) => pawn.hp <= 0)
          .map(({ kind, side }) => ({ kind, side }))
        if (fallen.length) blows = [...blows, { fallen }]
        const burned = { ...state, pawns, blows }
        record?.(
          captureFrame(burned, {
            kind: 'hellfire',
            from: hellfire[0],
            to: hellfire[0],
            centers: hellfire,
            impacts,
          }),
        )
        pawns = pawns.filter((pawn) => pawn.hp > 0)
        clearFallenProtection(pawns)
        const winner = pawns.some((pawn) => pawn.kind === 'king')
          ? winnerFrom(pawns, 'player')
          : 'draw'
        if (winner) return endBattle({ ...burned, pawns, hellfire: [] }, winner)
      }
      round++
      order = order.filter((id) => pawns.some((p) => p.id === id))
      for (const pawn of pawns) {
        pawn.bonusEnergy = 0
        pawn.energy = pawn.maxEnergy
        pawn.specialUsed = false
      }
      ;({ hellfire, randomState } = markHellfire({ ...state, pawns, round, randomState }))
      active = 0
    }
    const next = pawns.find((p) => p.id === order[active])
    if (next) {
      next.protectingId = null
      if (
        next.springSince !== null &&
        round > next.springSince &&
        state.tiles.get(key(next.q, next.r))?.feature === 'spring' &&
        next.hp < next.maxHp
      ) {
        next.hp++
      }
      break
    }
    active++
  }
  return {
    ...state,
    pawns,
    hellfire,
    randomState,
    order,
    active,
    round,
    blows,
  }
}

export function clearFallenProtection(pawns: Pawn[]): void {
  for (const protector of pawns) {
    if (!pawns.some((pawn) => pawn.id === protector.protectingId)) protector.protectingId = null
  }
}

export function captureFrame(
  state: GameState,
  effect: BattleEffect,
  fallen: Pawn[] = [],
): BattleFrame {
  return {
    state: {
      ...state,
      tiles: new Map([...state.tiles].map(([k, tile]) => [k, { ...tile }])),
      hellfire: state.hellfire.map((center) => ({ ...center })),
      pawns: [...state.pawns, ...fallen].map((pawn) => pawn.clone()),
      order: [...state.order],
      winner: null,
    },
    effect,
  }
}
