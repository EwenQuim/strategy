import tutorialLevels from './campaigns/000-tutorial.json' with { type: 'json' }
import originalLevels from './campaigns/001-original.json' with { type: 'json' }
import brutalLevels from './campaigns/002-brutal.json' with { type: 'json' }
import shatteredLevels from './campaigns/003-shattered.json' with { type: 'json' }
import ringLevels from './campaigns/004-war-of-the-ring.json' with { type: 'json' }
import throneLevels from './campaigns/005-iron-throne.json' with { type: 'json' }
import spartaLevels from './campaigns/006-hot-gates.json' with { type: 'json' }
import ragnarokLevels from './campaigns/007-ragnarok.json' with { type: 'json' }
import { mapFromRows, type Terrain, type TileFeature } from './engine/hex.ts'
import { validateSetup } from './engine/setup.ts'
import { BOT_LEVELS, type BotDifficulty, type BotOptions } from './engine/ai.ts'
import type { BotConfig } from '../bots/catalog.ts'
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
  unlocks: readonly PawnKind[]
}

export interface Campaign {
  slug: string
  name: string
  levels: CampaignLevel[]
  requiredVictories?: number
  developerPreview?: boolean
  startingUnits: readonly PawnKind[]
  depth?: BotOptions['depth']
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
  'lancer',
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
  tutorialLevels as Omit<CampaignLevel, 'newElements' | 'unlocks'>[],
  originalLevels as Omit<CampaignLevel, 'newElements' | 'unlocks'>[],
  brutalLevels as Omit<CampaignLevel, 'newElements' | 'unlocks'>[],
  shatteredLevels as Omit<CampaignLevel, 'newElements' | 'unlocks'>[],
  ringLevels as Omit<CampaignLevel, 'newElements' | 'unlocks'>[],
  throneLevels as Omit<CampaignLevel, 'newElements' | 'unlocks'>[],
  spartaLevels as Omit<CampaignLevel, 'newElements' | 'unlocks'>[],
  ragnarokLevels as Omit<CampaignLevel, 'newElements' | 'unlocks'>[],
]

for (const levels of packs) {
  levels.forEach((level, index) => {
    if (level.id !== index + 1 || !level.name || !level.seed || !BOT_LEVELS[level.difficulty])
      throw new Error('Campaign level ' + (index + 1) + ' is malformed')
    validateSetup(level.setup, mapFromRows(level.setup.map))
  })
}

const CLASSIC_UNITS: readonly PawnKind[] = [
  'king',
  'swordsman',
  'archer',
  'magician',
  'bulwark',
  'bomber',
  'ninja',
]
const startingUnits: readonly (readonly PawnKind[])[] = [
  ['king'],
  ['king', 'swordsman'],
  ['king', 'swordsman'],
  CLASSIC_UNITS,
  CLASSIC_UNITS,
  CLASSIC_UNITS,
  CLASSIC_UNITS,
  [...CLASSIC_UNITS, 'wolf', 'hoplite'],
]

// Unlocks are inferred from authored armies, never from a generated/replaced deployment.
export function withUnitUnlocks<Level extends { setup: FixedBattleSetup }>(
  levels: readonly Level[],
  availableAtStart: readonly PawnKind[],
): (Level & { unlocks: readonly PawnKind[] })[] {
  const available = new Set(availableAtStart)
  return levels.map((level, index) => {
    if (level.setup.player.some((unit) => !available.has(unit.kind)))
      throw new Error(
        `Campaign level ${index + 1} uses a recruit before its enemy introduction`,
      )
    const unlocks = [...new Set(level.setup.enemy.map((unit) => unit.kind))].filter(
      (kind) => !available.has(kind),
    )
    if (unlocks.some((kind) => !level.setup.firstEnemyKinds?.includes(kind)))
      throw new Error(`Campaign level ${index + 1} must give new enemies early initiative`)
    for (const kind of unlocks) {
      available.add(kind)
      const next = levels[index + 1]
      if (next && !next.setup.player.some((unit) => unit.kind === kind))
        throw new Error(
          `Campaign level ${index + 2} must let the player use the newly unlocked ${kind}`,
        )
    }
    return { ...level, unlocks }
  })
}

const briefedCampaigns = withBriefings(
  packs.map((levels, index) => withUnitUnlocks(levels, startingUnits[index])),
)

export const CAMPAIGNS: Campaign[] = [
  {
    slug: 'tutorial',
    name: 'Tutorial',
    levels: briefedCampaigns[0],
    startingUnits: startingUnits[0],
  },
  {
    slug: 'original',
    name: 'Original',
    levels: briefedCampaigns[1],
    startingUnits: startingUnits[1],
  },
  {
    slug: 'brutal',
    name: 'Brutal',
    levels: briefedCampaigns[2],
    startingUnits: startingUnits[2],
    requiredVictories: 10,
    depth: 4,
  },
  {
    slug: 'shattered',
    name: 'Shattered Crown',
    levels: briefedCampaigns[3],
    developerPreview: true,
    startingUnits: startingUnits[3],
  },
  {
    slug: 'war-of-the-ring',
    name: 'War of the Ring',
    levels: briefedCampaigns[4],
    requiredVictories: 25,
    startingUnits: startingUnits[4],
  },
  {
    slug: 'iron-throne',
    name: 'Iron Throne',
    levels: briefedCampaigns[5],
    requiredVictories: 35,
    startingUnits: startingUnits[5],
  },
  {
    slug: 'hot-gates',
    name: 'Thermopylae',
    levels: briefedCampaigns[6],
    requiredVictories: 45,
    startingUnits: startingUnits[6],
  },
  {
    slug: 'ragnarok',
    name: 'Ragnarok',
    levels: briefedCampaigns[7],
    requiredVictories: 55,
    startingUnits: startingUnits[7],
  },
]

export const TUTORIAL = CAMPAIGNS[0]

export function campaignBot(campaign: Campaign, level: CampaignLevel): BotConfig {
  return {
    name: 'depthsearch',
    options: {
      ...BOT_LEVELS[level.difficulty],
      ...(campaign.depth !== undefined ? { depth: campaign.depth } : {}),
    },
  }
}

export function totalVictories(completedIn: (slug: string) => number): number {
  return CAMPAIGNS.reduce((sum, campaign) => sum + completedIn(campaign.slug), 0)
}

export function isCampaignUnlocked(
  campaign: Campaign,
  completedIn: (slug: string) => number,
): boolean {
  return totalVictories(completedIn) >= (campaign.requiredVictories ?? 0)
}

export const visibleCampaigns = (developerPreview: boolean): Campaign[] =>
  CAMPAIGNS.filter((campaign) => developerPreview || !campaign.developerPreview)

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

const levelExists = (campaign: Campaign, level: number) =>
  Number.isInteger(level) && level >= 1 && level <= campaign.levels.length

export function isLevelUnlocked(
  campaign: Campaign,
  level: number,
  cleared: readonly number[],
  developerPreview: boolean,
): boolean {
  return (
    levelExists(campaign, level) && (developerPreview || level <= Math.max(0, ...cleared) + 1)
  )
}

export function completeCampaignLevel(
  campaign: Campaign,
  cleared: readonly number[],
  level: number,
): readonly number[] {
  return levelExists(campaign, level) && !cleared.includes(level)
    ? [...cleared, level].sort((a, b) => a - b)
    : cleared
}
