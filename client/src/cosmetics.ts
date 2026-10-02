export type CosmeticId = 'emerald' | 'iron' | 'royal' | 'ember' | 'shadow' | 'gilded'

export interface Cosmetic {
  readonly id: CosmeticId
  // First three are available to everyone; the rest open at these counts.
  readonly requiredAchievements: number
  readonly base: readonly [string, string]
  readonly rim: string
  readonly ink: string
}

// Order matters: the first three are free, then one unlocks every 5 achievements.
export const COSMETICS: readonly Cosmetic[] = [
  {
    id: 'emerald',
    requiredAchievements: 0,
    base: ['#407265', '#193e35'],
    rim: '#b2ceaa',
    ink: '#f1e8d2',
  },
  {
    id: 'iron',
    requiredAchievements: 0,
    base: ['#5d6470', '#2b313b'],
    rim: '#aeb6c2',
    ink: '#f1e8d2',
  },
  {
    id: 'royal',
    requiredAchievements: 0,
    base: ['#4a5d9e', '#232e57'],
    rim: '#9fb0e0',
    ink: '#f1e8d2',
  },
  {
    id: 'ember',
    requiredAchievements: 5,
    base: ['#a35f4d', '#5c2b22'],
    rim: '#e0a37f',
    ink: '#ffe3c2',
  },
  {
    id: 'shadow',
    requiredAchievements: 10,
    base: ['#3b3f4a', '#14161d'],
    rim: '#7d8598',
    ink: '#dfe4f0',
  },
  {
    id: 'gilded',
    requiredAchievements: 15,
    base: ['#8a6a2f', '#4a3a14'],
    rim: '#f0d38e',
    ink: '#fff3cf',
  },
]

const COSMETIC_KEY = 'hexmate.cosmetic'

export function isCosmeticUnlocked(cosmetic: Cosmetic, achievements: number): boolean {
  return achievements >= cosmetic.requiredAchievements
}

export function availableCosmetics(achievements: number): readonly Cosmetic[] {
  return COSMETICS.filter((cosmetic) => isCosmeticUnlocked(cosmetic, achievements))
}

export function readCosmeticPreference(): CosmeticId {
  try {
    const stored = localStorage.getItem(COSMETIC_KEY)
    const cosmetic = COSMETICS.find(({ id }) => id === stored)
    return cosmetic ? cosmetic.id : COSMETICS[0].id
  } catch {
    return COSMETICS[0].id
  }
}

export function saveCosmeticPreference(id: CosmeticId): void {
  try {
    localStorage.setItem(COSMETIC_KEY, id)
  } catch {
    // localStorage unavailable: the chosen skin only lasts until reload
  }
}

export function cosmeticOf(id: CosmeticId): Cosmetic {
  return COSMETICS.find((cosmetic) => cosmetic.id === id) ?? COSMETICS[0]
}
