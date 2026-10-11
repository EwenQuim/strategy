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
import { Skeleton } from './skeleton.ts'
import { Swordsman } from './swordsman.ts'
import { Wolf } from './wolf.ts'

export * from './pawn.ts'
export {
  Archer,
  Beast,
  Bomber,
  Bulwark,
  King,
  Lancer,
  Magician,
  Necromancer,
  Ninja,
  Skeleton,
  Swordsman,
}
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
  skeleton: Skeleton,
}

export type PawnKind = keyof typeof PAWN_CLASSES

// The beast is a map prize and the skeleton a summon: neither enters a battle as a recruit.
export const RECRUIT_CLASSES = Object.values(PAWN_CLASSES).filter(
  (Unit) => Unit !== King && Unit !== Beast && Unit !== Skeleton,
)
