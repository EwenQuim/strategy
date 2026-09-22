import { hexDist } from './engine/hex.ts'
import type { Pawn } from './engine/pawns.ts'

export interface BotStrategy {
  chooseTarget(attacker: Pawn, targets: readonly Pawn[]): Pawn | undefined
}

export const nearestTarget: BotStrategy = {
  chooseTarget: (attacker, targets) =>
    targets.toSorted((a, b) => hexDist(attacker, a) - hexDist(attacker, b))[0],
}

export const huntTheKing: BotStrategy = {
  chooseTarget: (attacker, targets) =>
    nearestTarget.chooseTarget(
      attacker,
      targets.filter((p) => p.kind === 'king'),
    ) ?? nearestTarget.chooseTarget(attacker, targets),
}
