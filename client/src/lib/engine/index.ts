export * from './hex.ts'
export * from './shapes.ts'
export * from './pawns/index.ts'
export * from './engine.ts'
export { hazardDamage, hellfireCenters } from './hazards.ts'
export type { Hazard } from './hazards.ts'
export type { BattleSetup, FixedBattleSetup } from './setup.ts'
export { randomArmy, symmetricSeed } from './setup.ts'
export {
  canAttack,
  canUseSpecial,
  maxWalkSteps,
  specialTargets,
  movementDestinations,
  walkingPaths,
  pawnAt,
  protectorFor,
  rangeTiles,
  threatenedTiles,
} from './combat.ts'
export { BIOMES, type Biome } from './biomes/index.ts'
