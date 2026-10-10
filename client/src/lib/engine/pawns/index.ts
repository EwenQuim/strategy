import { Archer } from './archer.ts'
import { Berserker } from './berserker.ts'
import { Beast } from './beast.ts'
import { Bulwark } from './bulwark.ts'
import { Bomber } from './bomber.ts'
import { Hoplite } from './hoplite.ts'
import { King } from './king.ts'
import { Lancer } from './lancer.ts'
import { Magician } from './magician.ts'
import { Necromancer } from './necromancer.ts'
import { Ninja } from './ninja.ts'
import { Swordsman } from './swordsman.ts'
import { Wolf } from './wolf.ts'

export * from './pawn.ts'
export { Archer, Beast, Bomber, Bulwark, King, Lancer, Magician, Necromancer, Ninja, Swordsman }
export { chargeDestinations } from './swordsman.ts'
export { jumpDestinations } from './ninja.ts'

export const PAWN_CLASSES = {
  king: King,
  swordsman: Swordsman,
  archer: Archer,
  magician: Magician,
  ninja: Ninja,
  bulwark: Bulwark,
  bomber: Bomber,
  hoplite: Hoplite,
  wolf: Wolf,
  berserker: Berserker,
  lancer: Lancer,
  necromancer: Necromancer,
  beast: Beast,
}

export type PawnKind = keyof typeof PAWN_CLASSES

// The beast is a map prize, not a recruit: it only enters a battle by waking from its den.
export const RECRUIT_CLASSES = Object.values(PAWN_CLASSES).filter(
  (Unit) => Unit !== King && Unit !== Beast,
)
