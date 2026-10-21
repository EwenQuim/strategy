import { key } from './hex.ts'
import { applyHazards, cloneHazards, scheduleHazards, STORM_ENERGY } from './hazards.ts'
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
  let { pawns, hazards, randomState } = state
  let { order, round, blows } = state
  let active = state.active + 1
  while (true) {
    if (active >= order.length) {
      const effect = applyHazards(hazards, pawns)
      if (effect) {
        const fallen = pawns
          .filter((pawn) => pawn.hp <= 0)
          .map(({ kind, side }) => ({ kind, side }))
        if (fallen.length) blows = [...blows, { fallen }]
        const burned = { ...state, pawns, blows }
        record?.(captureFrame(burned, effect))
        pawns = pawns.filter((pawn) => pawn.hp > 0)
        clearFallenProtection(pawns)
        const winner = pawns.some((pawn) => pawn.kind === 'king')
          ? winnerFrom(pawns, 'player')
          : 'draw'
        if (winner) return endBattle({ ...burned, pawns, hazards: [] }, winner)
      }
      round++
      order = order.filter((id) => pawns.some((p) => p.id === id))
      for (const pawn of pawns) {
        pawn.bonusEnergy = 0
        pawn.energy = pawn.maxEnergy
        pawn.specialUsed = false
      }
      ;({ hazards, randomState } = scheduleHazards({ ...state, pawns, round, randomState }))
      if (hazards.some((hazard) => hazard.kind === 'sandstorm'))
        for (const pawn of pawns) pawn.energy = Math.min(pawn.energy, STORM_ENERGY)
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
    hazards,
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
      hazards: cloneHazards(state.hazards),
      pawns: [...state.pawns, ...fallen].map((pawn) => pawn.clone()),
      order: [...state.order],
      winner: null,
    },
    effect,
  }
}
