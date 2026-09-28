import originalLevels from './campaigns/001-original.json' with { type: 'json' }
import brutalLevels from './campaigns/002-brutal.json' with { type: 'json' }
import shatteredLevels from './campaigns/003-shattered.json' with { type: 'json' }
import ringLevels from './campaigns/004-war-of-the-ring.json' with { type: 'json' }
import throneLevels from './campaigns/005-iron-throne.json' with { type: 'json' }
import spartaLevels from './campaigns/006-hot-gates.json' with { type: 'json' }
import ragnarokLevels from './campaigns/007-ragnarok.json' with { type: 'json' }
import { mapFromRows, type Terrain, type TileFeature } from './engine/hex.ts'
import { validateSetup } from './engine/setup.ts'
import { BOT_LEVELS, type BotDifficulty } from './engine/ai.ts'
import type { PawnKind } from './engine/pawns/index.ts'
import type { Biome, FixedBattleSetup } from './engine/index.ts'

export type IntroducedElement =
  | PawnKind
  | Exclude<Terrain, 'plain' | 'forest' | 'palm' | 'basalt'>
  | TileFeature
  | Exclude<Biome, 'verdant' | 'mountains' | 'desert' | 'volcano'>

export interface CampaignLevel {
  id: number
  name: string
  seed: string
  difficulty: BotDifficulty
  setup: FixedBattleSetup
  newElements: readonly IntroducedElement[]
}

export interface Campaign {
  slug: string
  name: string
  levels: CampaignLevel[]
  requiredVictories?: number
}

const INTRODUCED_ELEMENTS: readonly IntroducedElement[] = [
  'king',
  'swordsman',
  'archer',
  'magician',
  'bulwark',
  'bomber',
  'ninja',
  'hoplite',
  'wolf',
  'berserker',
  'lake',
  'mountain',
  'sand',
  'lava',
  'watchtower',
  'spring',
  'rune',
  'hell',
]

export function withBriefings<Level extends { setup: FixedBattleSetup }>(
  campaignsInReleaseOrder: readonly (readonly Level[])[],
): (Level & { newElements: readonly IntroducedElement[] })[][] {
  const introduced = new Set<string>()
  return campaignsInReleaseOrder.map((levels) =>
    levels.map((level) => {
      const present = new Set<string>([
        level.setup.biome,
        ...[...level.setup.player, ...level.setup.enemy].map((pawn) => pawn.kind),
        ...[...mapFromRows(level.setup.map).values()].flatMap((tile) => [
          tile.terrain,
          tile.feature ?? '',
        ]),
      ])
      const fresh = INTRODUCED_ELEMENTS.filter(
        (element) => present.has(element) && !introduced.has(element),
      )
      for (const element of fresh) introduced.add(element)
      return { ...level, newElements: fresh }
    }),
  )
}

const packs = [
  originalLevels as Omit<CampaignLevel, 'newElements'>[],
  brutalLevels as Omit<CampaignLevel, 'newElements'>[],
  shatteredLevels as Omit<CampaignLevel, 'newElements'>[],
  ringLevels as Omit<CampaignLevel, 'newElements'>[],
  throneLevels as Omit<CampaignLevel, 'newElements'>[],
  spartaLevels as Omit<CampaignLevel, 'newElements'>[],
  ragnarokLevels as Omit<CampaignLevel, 'newElements'>[],
]

for (const levels of packs) {
  levels.forEach((level, index) => {
    if (level.id !== index + 1 || !level.name || !level.seed || !BOT_LEVELS[level.difficulty])
      throw new Error('Campaign level ' + (index + 1) + ' is malformed')
    validateSetup(level.setup, mapFromRows(level.setup.map))
  })
}

const briefedCampaigns = withBriefings(packs)

export const CAMPAIGNS: Campaign[] = [
  { slug: 'original', name: 'Original', levels: briefedCampaigns[0] },
  { slug: 'brutal', name: 'Brutal', levels: briefedCampaigns[1] },
  { slug: 'shattered', name: 'Shattered Crown', levels: briefedCampaigns[2] },
  {
    slug: 'war-of-the-ring',
    name: 'War of the Ring',
    levels: briefedCampaigns[3],
    requiredVictories: 25,
  },
  {
    slug: 'iron-throne',
    name: 'Iron Throne',
    levels: briefedCampaigns[4],
    requiredVictories: 35,
  },
  {
    slug: 'hot-gates',
    name: 'Thermopylae',
    levels: briefedCampaigns[5],
    requiredVictories: 45,
  },
  {
    slug: 'ragnarok',
    name: 'Ragnarok',
    levels: briefedCampaigns[6],
    requiredVictories: 55,
  },
]

export function totalVictories(completedIn: (slug: string) => number): number {
  return CAMPAIGNS.reduce((sum, campaign) => sum + completedIn(campaign.slug), 0)
}

export function isCampaignUnlocked(
  campaign: Campaign,
  completedIn: (slug: string) => number,
): boolean {
  return totalVictories(completedIn) >= (campaign.requiredVictories ?? 0)
}

// The original campaign keeps its legacy key so existing players keep their progress.
export const CAMPAIGN_STORAGE_KEY = 'hexmate:campaign:v1'

export function campaignStorageKey(slug: string): string {
  return slug === 'original' ? CAMPAIGN_STORAGE_KEY : 'hexmate:campaign:' + slug
}

export function parseCampaignProgress(value: string | null, levels: number): number[] {
  if (value !== null && /^\d+$/.test(value) && Number(value) <= levels)
    return Array.from({ length: Number(value) }, (_, index) => index + 1)
  let cleared: unknown
  try {
    cleared = JSON.parse(value ?? '')
  } catch {
    return []
  }
  return Array.isArray(cleared) &&
    cleared.every((level) => Number.isInteger(level) && level >= 1 && level <= levels)
    ? [...new Set<number>(cleared)].sort((a, b) => a - b)
    : []
}

export function isLevelUnlocked(
  campaign: Campaign,
  level: number,
  cleared: readonly number[],
): boolean {
  return (
    Number.isInteger(level) &&
    level >= 1 &&
    level <= campaign.levels.length &&
    (campaign.slug !== 'original' || level <= cleared.length + 1)
  )
}

export function completeCampaignLevel(
  campaign: Campaign,
  cleared: readonly number[],
  level: number,
): readonly number[] {
  return isLevelUnlocked(campaign, level, cleared) && !cleared.includes(level)
    ? [...cleared, level].sort((a, b) => a - b)
    : cleared
}
