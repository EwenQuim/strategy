import type { Pawn } from '../lib/engine/pawns/index.ts'
import { hexDist } from '../lib/engine/hex.ts'

export interface TargetPicker {
  chooseTarget(attacker: Pawn, targets: readonly Pawn[]): Pawn | undefined
}

export const nearestTarget: TargetPicker = {
  chooseTarget: (attacker, targets) =>
    targets.toSorted((a, b) => hexDist(attacker, a) - hexDist(attacker, b))[0],
}

export const huntTheKing: TargetPicker = {
  chooseTarget: (attacker, targets) =>
    nearestTarget.chooseTarget(
      attacker,
      targets.filter((p) => p.kind === 'king'),
    ) ?? nearestTarget.chooseTarget(attacker, targets),
}
