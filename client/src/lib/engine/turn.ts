import { key } from './hex.ts'
import { inHellfire, markHellfire } from './hellfire.ts'
import { label } from './combat.ts'
import type { Pawn, Side } from './pawns/index.ts'
import type { BattleEffect, BattleFrame, GameState } from './types.ts'

export function winnerFrom(pawns: Pawn[], actingSide: Side): Side | null {
  if (!pawns.some((p) => p.kind === 'king' && p.side === actingSide))
    return actingSide === 'player' ? 'enemy' : 'player'
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'enemy')) return 'player'
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'player')) return 'enemy'
  return null
}

export function finishTurn(pawn: Pawn, log: string[]): boolean {
  const previousEscape = pawn.escapeChance
  pawn.endTurn()
  const gained = pawn.escapeChance - previousEscape
  if (gained <= 0) return false
  log.push(`${label(pawn)} ends turn: +${gained}% escape (${pawn.escapeChance}% total).`)
  return true
}

export function endBattle(
  state: GameState,
  winner: NonNullable<GameState['winner']>,
): GameState {
  const message =
    winner === 'draw'
      ? 'Both crowns have fallen. Draw.'
      : winner === 'player'
        ? 'The enemy crown has fallen. Victory!'
        : 'Your crown has fallen.'
  return {
    ...state,
    winner,
    phase: 'over',
    log: [...state.log, message].slice(-40),
    logCount: state.logCount + 1,
  }
}

export function advanceTurn(
  state: GameState,
  record?: (frame: BattleFrame) => void,
): GameState {
  let { pawns, hellfire, randomState } = state
  const log = [...state.log]
  let { order, round, logCount } = state
  let active = state.active + 1
  while (true) {
    if (active >= order.length) {
      if (hellfire.length) {
        const impacts = pawns
          .filter((pawn) => inHellfire(hellfire, pawn))
          .map((pawn) => {
            pawn.hp--
            log.push(label(pawn) + ' takes 1 Hellfire damage.')
            logCount++
            if (pawn.hp <= 0) {
              log.push(label(pawn) + ' has fallen.')
              logCount++
            }
            return { q: pawn.q, r: pawn.r, damage: 1 }
          })
        const burned = { ...state, pawns, log, logCount }
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
        clearBrokenProtection(pawns)
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
        pawn.escapeChance = 0
        pawn.specialUsed = false
      }
      ;({ hellfire, randomState } = markHellfire({ ...state, pawns, round, randomState }))
      active = 0
      log.push('Round ' + round + '. Energy restored; escape chances reset.')
      logCount++
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
        log.push(label(next) + ' recovers 1 health at the spring.')
        logCount++
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
    log: log.slice(-40),
    logCount,
  }
}

export function clearBrokenProtection(pawns: Pawn[]): void {
  for (const protector of pawns) {
    if (protector.protectingId === null) continue
    const ally = pawns.find((pawn) => pawn.id === protector.protectingId)
    if (!ally || !protector.special.targets(protector, [ally]).length)
      protector.protectingId = null
  }
}

export function captureFrame(
  state: GameState,
  effect: BattleEffect,
  actor?: Pawn,
): BattleFrame {
  return {
    state: {
      ...state,
      tiles: new Map([...state.tiles].map(([k, tile]) => [k, { ...tile }])),
      hellfire: state.hellfire.map((center) => ({ ...center })),
      pawns: (actor && actor.hp <= 0 ? [...state.pawns, actor] : state.pawns).map((pawn) =>
        pawn.clone(),
      ),
      order: [...state.order],
      log: [...state.log],
      winner: null,
      phase: 'move',
    },
    effect,
  }
}
