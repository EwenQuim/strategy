import tutorialLevels from './lib/campaigns/000-tutorial.json' with { type: 'json' }
import originalLevels from './lib/campaigns/001-original.json' with { type: 'json' }
import brutalLevels from './lib/campaigns/002-brutal.json' with { type: 'json' }
import ringLevels from './lib/campaigns/004-war-of-the-ring.json' with { type: 'json' }
import throneLevels from './lib/campaigns/005-iron-throne.json' with { type: 'json' }
import spartaLevels from './lib/campaigns/006-hot-gates.json' with { type: 'json' }
import ragnarokLevels from './lib/campaigns/007-ragnarok.json' with { type: 'json' }
import { mapFromRows, type Terrain, type TileFeature } from './lib/engine/hex.ts'
import { validateSetup } from './lib/engine/setup.ts'
import { BOTS, type BotConfig } from './bots/catalog.ts'
import type { PawnKind } from './lib/engine/pawns/index.ts'
import type { Biome, FixedBattleSetup, GameState } from './lib/engine/index.ts'

export type IntroducedElement =
  | PawnKind
  | Exclude<Terrain, 'plain' | 'forest' | 'palm' | 'basalt'>
  | TileFeature
  | Exclude<Biome, 'verdant' | 'mountains' | 'desert' | 'volcano'>

export interface CampaignLevel {
  id: number
  name: string
  seed: string
  bot: BotConfig
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
  unlockToasts?: boolean
  achievements?: boolean
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
  'marksman',
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

export const STARTER_RECRUITS: readonly PawnKind[] = [
  'swordsman',
  'archer',
  'magician',
  'ninja',
  'bulwark',
]

const CLASSIC_UNITS: readonly PawnKind[] = [
  'king',
  'swordsman',
  'archer',
  'magician',
  'bulwark',
  'bomber',
  'ninja',
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

type AuthoredCampaign = Omit<Campaign, 'levels'> & {
  levels: Omit<CampaignLevel, 'newElements' | 'unlocks'>[]
}

// The recruits a first victory at this level unlocks, shown as toasts.
export function campaignUnlocks(
  campaign: Campaign | undefined,
  level: number | undefined,
  alreadyCleared: boolean,
  winner: GameState['winner'],
) {
  return winner === 'player' &&
    campaign &&
    campaign.unlockToasts !== false &&
    level &&
    !alreadyCleared
    ? campaign.levels[level - 1].unlocks
    : []
}

const packs: AuthoredCampaign[] = [
  {
    slug: 'tutorial',
    name: 'Tutorial',
    levels: tutorialLevels as AuthoredCampaign['levels'],
    startingUnits: ['king'],
    achievements: false,
  },
  {
    slug: 'original',
    name: 'Original',
    levels: originalLevels as AuthoredCampaign['levels'],
    startingUnits: ['king', 'swordsman'],
  },
  {
    slug: 'brutal',
    name: 'Brutal',
    levels: brutalLevels as AuthoredCampaign['levels'],
    startingUnits: ['king', 'swordsman'],
    unlockToasts: false,
    requiredVictories: 10,
  },
  {
    slug: 'war-of-the-ring',
    name: 'War of the Ring',
    levels: ringLevels as AuthoredCampaign['levels'],
    requiredVictories: 25,
    startingUnits: CLASSIC_UNITS,
  },
  {
    slug: 'iron-throne',
    name: 'Iron Throne',
    levels: throneLevels as AuthoredCampaign['levels'],
    requiredVictories: 35,
    startingUnits: CLASSIC_UNITS,
  },
  {
    slug: 'hot-gates',
    name: 'Thermopylae',
    levels: spartaLevels as AuthoredCampaign['levels'],
    requiredVictories: 45,
    startingUnits: CLASSIC_UNITS,
  },
  {
    slug: 'ragnarok',
    name: 'Ragnarok',
    levels: ragnarokLevels as AuthoredCampaign['levels'],
    requiredVictories: 55,
    startingUnits: [...CLASSIC_UNITS, 'wolf', 'hoplite'],
  },
]

for (const { levels } of packs) {
  levels.forEach((level, index) => {
    if (
      level.id !== index + 1 ||
      !level.name ||
      !level.seed ||
      !level.bot ||
      !Object.hasOwn(BOTS, level.bot.name) ||
      typeof level.bot.options !== 'object' ||
      level.bot.options === null
    )
      throw new Error('Campaign level ' + (index + 1) + ' is malformed')
    const bot = BOTS[level.bot.name].resolve(level.bot.options)
    level.bot = { name: bot.name, options: bot.options } as BotConfig
    validateSetup(level.setup, mapFromRows(level.setup.map))
  })
}

export const CAMPAIGNS: Campaign[] = withBriefings(
  packs.map((pack) => withUnitUnlocks(pack.levels, pack.startingUnits)),
).map((levels, index) => ({ ...packs[index], levels }))

export const TUTORIAL = CAMPAIGNS[0]

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
