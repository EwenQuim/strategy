import originalLevels from './campaigns/001-original.json' with { type: 'json' }
import brutalLevels from './campaigns/002-brutal.json' with { type: 'json' }
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
}

const INTRODUCED_ELEMENTS: readonly IntroducedElement[] = [
  'king',
  'swordsman',
  'archer',
  'magician',
  'bulwark',
  'bomber',
  'ninja',
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
]

// The original campaign keeps its legacy key so existing players keep their progress.
export const CAMPAIGN_STORAGE_KEY = 'hexmate:campaign:v1'

export function campaignStorageKey(slug: string): string {
  return slug === 'original' ? CAMPAIGN_STORAGE_KEY : 'hexmate:campaign:' + slug
}

export function parseCampaignProgress(value: string | null, levels: number): number {
  const completed = Number(value)
  return value !== null &&
    /^\d+$/.test(value) &&
    Number.isInteger(completed) &&
    completed >= 0 &&
    completed <= levels
    ? completed
    : 0
}

export function isLevelUnlocked(campaign: Campaign, level: number, completed: number): boolean {
  return (
    Number.isInteger(level) &&
    level >= 1 &&
    level <= campaign.levels.length &&
    level <= completed + 1
  )
}

export function completeCampaignLevel(
  campaign: Campaign,
  completed: number,
  level: number,
): number {
  return isLevelUnlocked(campaign, level, completed) ? Math.max(completed, level) : completed
}
