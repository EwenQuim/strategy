import { hexDist } from './hex.ts'
import type { Pawn } from './pawns.ts'

export interface EnemyStrategy {
  chooseTarget(attacker: Pawn, targets: readonly Pawn[]): Pawn | undefined
}

export const nearestTarget: EnemyStrategy = {
  chooseTarget: (attacker, targets) =>
    [...targets].sort((a, b) => hexDist(attacker, a) - hexDist(attacker, b))[0],
}

export const huntTheKing: EnemyStrategy = {
  chooseTarget: (attacker, targets) =>
    nearestTarget.chooseTarget(
      attacker,
      targets.filter((p) => p.kind === 'king'),
    ) ?? nearestTarget.chooseTarget(attacker, targets),
}
