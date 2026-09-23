import { Archer } from './archer.ts'
import { Bombard } from './bombard.ts'
import { Bulwark } from './bulwark.ts'
import { Cleric } from './cleric.ts'
import { Harpooner } from './harpooner.ts'
import { King } from './king.ts'
import { Lancer } from './lancer.ts'
import { Magician } from './magician.ts'
import { Ninja } from './ninja.ts'
import { Sniper } from './sniper.ts'
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
  bombard: Bombard,
  sniper: Sniper,
  lancer: Lancer,
  harpooner: Harpooner,
  cleric: Cleric,
}

export type PawnKind = keyof typeof PAWN_CLASSES

export const RECRUIT_CLASSES = Object.values(PAWN_CLASSES).filter((Unit) => Unit !== King)
