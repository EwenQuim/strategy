import type { AchievementId } from './achievements.ts'
import originalLevels from './campaigns/001-original.json' with { type: 'json' }
import brutalLevels from './campaigns/002-brutal.json' with { type: 'json' }
import shatteredLevels from './campaigns/003-shattered.json' with { type: 'json' }
import ringLevels from './campaigns/004-war-of-the-ring.json' with { type: 'json' }
import throneLevels from './campaigns/005-iron-throne.json' with { type: 'json' }
import spartaLevels from './campaigns/006-hot-gates.json' with { type: 'json' }
import ragnarokLevels from './campaigns/007-ragnarok.json' with { type: 'json' }
import gauntletLevels from './campaigns/008-gauntlet.json' with { type: 'json' }
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

// The Gauntlet is earned through achievements: each level mirrors one.
export interface AchievementCampaignLevel extends CampaignLevel {
  readonly achievement: AchievementId
}

export interface Campaign {
  slug: string
  name: string
  levels: CampaignLevel[]
  requiredVictories?: number
  developerPreview?: boolean
  achievementGated?: boolean
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

// Each Gauntlet level is opened by the achievement it mirrors, in pack order.
const GAUNTLET_ACHIEVEMENTS: readonly AchievementId[] = [
  'speedrun',
  'reaper',
  'ninjaRegicide',
  'nobodyLeftBehind',
  'doneRight',
  'partyOfOne',
  'thread',
  'glassCannon',
  'rageQuit',
  'chainReaction',
  'floorIsLava',
  'towerCamper',
  'untouchable',
  'cleanHands',
  'dogs',
]

const gauntletLevelsTyped = gauntletLevels as unknown as Omit<CampaignLevel, 'newElements'>[]

if (gauntletLevelsTyped.length !== GAUNTLET_ACHIEVEMENTS.length)
  throw new Error('The Gauntlet pack must have one level per achievement')
for (const [index, level] of gauntletLevelsTyped.entries()) {
  if (
    level.id !== index + 1 ||
    !level.name ||
    !level.seed ||
    !Object.hasOwn(BOT_LEVELS, level.difficulty)
  )
    throw new Error('Gauntlet level ' + (index + 1) + ' is malformed')
  validateSetup(level.setup, mapFromRows(level.setup.map))
}

const gauntletPack = gauntletLevelsTyped.map((level, index) => ({
  ...level,
  achievement: GAUNTLET_ACHIEVEMENTS[index],
})) as AchievementCampaignLevel[]

export const CAMPAIGNS: Campaign[] = [
  { slug: 'original', name: 'Original', levels: briefedCampaigns[0] },
  { slug: 'brutal', name: 'Brutal', levels: briefedCampaigns[1] },
  {
    slug: 'shattered',
    name: 'Shattered Crown',
    levels: briefedCampaigns[2],
    developerPreview: true,
  },
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
  {
    slug: 'gauntlet',
    name: 'Gauntlet',
    levels: gauntletPack,
    achievementGated: true,
  },
]

export function totalVictories(completedIn: (slug: string) => number): number {
  return CAMPAIGNS.reduce((sum, campaign) => sum + completedIn(campaign.slug), 0)
}

export function isCampaignUnlocked(
  campaign: Campaign,
  completedIn: (slug: string) => number,
  earned: readonly AchievementId[] = [],
): boolean {
  if (campaign.achievementGated) return earned.length > 0
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

export function isLevelUnlocked(
  campaign: Campaign,
  level: number,
  cleared: readonly number[],
  earned: readonly AchievementId[] = [],
): boolean {
  const withinCampaign =
    Number.isInteger(level) && level >= 1 && level <= campaign.levels.length
  if (campaign.achievementGated) {
    const gate = campaign.levels[level - 1] as AchievementCampaignLevel
    return withinCampaign && !!gate?.achievement && earned.includes(gate.achievement)
  }
  return withinCampaign && (campaign.slug !== 'original' || level <= cleared.length + 1)
}

export function completeCampaignLevel(
  campaign: Campaign,
  cleared: readonly number[],
  level: number,
  earned: readonly AchievementId[] = [],
): readonly number[] {
  return isLevelUnlocked(campaign, level, cleared, earned) && !cleared.includes(level)
    ? [...cleared, level].sort((a, b) => a - b)
    : cleared
}
