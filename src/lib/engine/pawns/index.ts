import { Archer } from './archer.ts'
import { Bulwark } from './bulwark.ts'
import { King } from './king.ts'
import { Magician } from './magician.ts'
import { Ninja } from './ninja.ts'
import { Swordsman } from './swordsman.ts'

export * from './pawn.ts'
export { Archer, Bulwark, King, Magician, Ninja, Swordsman }
export { chargeDestinations } from './swordsman.ts'
export { jumpDestinations } from './ninja.ts'

export const PAWN_CLASSES = {
  king: King,
  swordsman: Swordsman,
  archer: Archer,
  magician: Magician,
  ninja: Ninja,
  bulwark: Bulwark,
}

export type PawnKind = keyof typeof PAWN_CLASSES

export const RECRUIT_CLASSES = Object.values(PAWN_CLASSES).filter((Unit) => Unit !== King)
