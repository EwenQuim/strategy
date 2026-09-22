import type { BattleSetup, Biome, Pawn } from './engine/index.ts'

const playerArmies: readonly BattleSetup['player'][] = [
  ['king', 'swordsman', 'archer'],
  ['king', 'swordsman', 'archer', 'magician'],
  ['king', 'swordsman', 'archer', 'magician', 'bulwark'],
  ['king', 'swordsman', 'archer', 'magician', 'bulwark', 'ninja'],
]

const encounters: readonly [name: string, biome: Biome, enemies: readonly Pawn['kind'][]][] = [
  ['First Watch', 'verdant', ['swordsman']],
  ['Bowmen', 'verdant', ['archer']],
  ['River Guard', 'verdant', ['swordsman', 'archer']],
  ['Forest Magic', 'verdant', ['swordsman', 'magician']],
  ['Vale Keep', 'verdant', ['swordsman', 'archer', 'swordsman']],
  ['High Pass', 'mountains', ['swordsman', 'archer']],
  ['Stone Wall', 'mountains', ['bulwark', 'swordsman', 'archer']],
  ['Ambush', 'mountains', ['ninja', 'swordsman', 'archer']],
  ['Twin Mages', 'mountains', ['magician', 'magician', 'bulwark']],
  ['Peak Fortress', 'mountains', ['swordsman', 'archer', 'bulwark', 'ninja']],
  ['Dune Patrol', 'desert', ['swordsman', 'archer', 'magician']],
  ['Sandstorm', 'desert', ['ninja', 'ninja', 'swordsman', 'archer']],
  ['Iron Caravan', 'desert', ['bulwark', 'bulwark', 'archer', 'magician']],
  ['Oasis Siege', 'desert', ['swordsman', 'swordsman', 'archer', 'ninja', 'magician']],
  ['Sun Citadel', 'desert', ['bulwark', 'swordsman', 'archer', 'magician', 'magician']],
  ['Homeward', 'verdant', ['bulwark', 'archer', 'magician', 'ninja', 'swordsman']],
  [
    'Frozen Gate',
    'mountains',
    ['bulwark', 'bulwark', 'archer', 'magician', 'ninja', 'swordsman'],
  ],
  ['Burning Sands', 'desert', ['ninja', 'ninja', 'archer', 'archer', 'magician', 'swordsman']],
  [
    'Royal Guard',
    'verdant',
    ['bulwark', 'bulwark', 'swordsman', 'swordsman', 'archer', 'magician', 'ninja'],
  ],
  [
    'Last Crown',
    'mountains',
    ['swordsman', 'archer', 'archer', 'magician', 'magician', 'bulwark', 'ninja'],
  ],
]

export const CAMPAIGN_LEVELS = encounters.map(([name, biome, enemies], index) => ({
  id: index + 1,
  name,
  seed: 'campaign-v1-' + (index + 1),
  setup: {
    biome,
    player: playerArmies[Math.floor(index / 5)],
    enemy: ['king', ...enemies],
  } satisfies BattleSetup,
}))

export const CAMPAIGN_STORAGE_KEY = 'hex-strategy:campaign:v1'

export function parseCampaignProgress(value: string | null): number {
  const completed = Number(value)
  return value !== null &&
    /^\d+$/.test(value) &&
    Number.isInteger(completed) &&
    completed >= 0 &&
    completed <= CAMPAIGN_LEVELS.length
    ? completed
    : 0
}

export function isLevelUnlocked(level: number, completed: number): boolean {
  return (
    Number.isInteger(level) &&
    level >= 1 &&
    level <= CAMPAIGN_LEVELS.length &&
    level <= completed + 1
  )
}

export function completeCampaignLevel(completed: number, level: number): number {
  return isLevelUnlocked(level, completed) ? Math.max(completed, level) : completed
}
