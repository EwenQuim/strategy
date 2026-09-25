import levels from './campaign-levels.json' with { type: 'json' }
import { mapFromRows, TILE_FEATURES } from './engine/hex.ts'
import { validateSetup } from './engine/setup.ts'
import { ESCAPE_BONUS, MAX_ESCAPE, PAWN_CLASSES, type PawnKind } from './engine/pawns/index.ts'
import type { FixedBattleSetup } from './engine/index.ts'

interface BriefingElement {
  readonly name: string
  readonly points: readonly string[]
}

export interface CampaignLevel {
  id: number
  name: string
  seed: string
  setup: FixedBattleSetup
  newElements: readonly BriefingElement[]
}

function unit(kind: PawnKind, ...specialPoints: string[]): BriefingElement {
  const { maxHp, attack, special } = new PAWN_CLASSES[kind](0, 0, 0, 'player')
  const range =
    attack.minRange === attack.maxRange
      ? String(attack.maxRange)
      : attack.minRange + '-' + attack.maxRange
  return {
    name: kind[0].toUpperCase() + kind.slice(1),
    points: [
      maxHp + ' HP · ' + attack.damage + ' dmg · range ' + range,
      special.name + ' (' + special.cost + ' energy): ' + specialPoints[0],
      ...specialPoints.slice(1),
    ],
  }
}

const INTRODUCTIONS: Record<string, readonly BriefingElement[]> = {
  swordsman: [unit('swordsman', 'move up to 2, then hit adjacent for 2')],
  king: [
    unit('king', 'heal adjacent allies +1, once per round', 'Lose your king, lose the battle'),
  ],
  archer: [
    unit('archer', '2 dmg, ignores Escape', 'Cannot shoot adjacent enemies'),
    {
      name: 'Escape',
      points: [
        'Unused energy at end of turn → +' + ESCAPE_BONUS + '% dodge each',
        'Max ' + MAX_ESCAPE + '%',
      ],
    },
  ],
  magician: [
    unit(
      'magician',
      '1 dmg to every enemy on a line',
      'Passes through everything, allies safe',
    ),
  ],
  bulwark: [
    unit(
      'bulwark',
      'takes the next hit for an ally within 2',
      'Slow: first step costs 2 energy',
    ),
  ],
  bomber: [
    unit(
      'bomber',
      'any tile within 2, 1 dmg to it and its 6 neighbors',
      'Hits allies and the bomber too',
    ),
  ],
  ninja: [
    unit(
      'ninja',
      'up to 3 tiles, over anything',
      'Jump does not attack: keep 1 energy to strike',
    ),
  ],
  lake: [{ name: 'Lakes', points: ['Block walking and Charge', 'Arrows and spells pass'] }],
  mountain: [
    { name: 'Mountains', points: ['Block walking and Charge', 'Arrows and spells pass'] },
  ],
  sand: [{ name: 'Desert', points: ['Open sand, no cover', 'Palms are decorative'] }],
  lava: [
    {
      name: 'Lava',
      points: [
        '-1 HP per tile entered, even on Charge',
        'Ignores Escape and Protect',
        'Basalt is safe',
      ],
    },
  ],
  watchtower: [
    { name: TILE_FEATURES.watchtower.name, points: ['Archer and Magician: +1 max range'] },
  ],
  spring: [{ name: TILE_FEATURES.spring.name, points: ['Stay until next turn: +1 HP'] }],
  rune: [
    {
      name: TILE_FEATURES.rune.name,
      points: ['First unit in: +2 energy this round', 'Single use'],
    },
  ],
  hell: [
    {
      name: 'Hellfire',
      points: [
        'Hatched area: 1 dmg at round end',
        'Ignores Escape and Protect',
        'Both kings down = draw',
      ],
    },
  ],
}

const introduced = new Set<string>()

export const CAMPAIGN_LEVELS: CampaignLevel[] = levels.map((level, index) => {
  if (level.id !== index + 1 || !level.name || !level.seed)
    throw new Error('Campaign level ' + (index + 1) + ' is malformed')
  const setup = level.setup as FixedBattleSetup
  const tiles = mapFromRows(setup.map)
  validateSetup(setup, tiles)
  const present = new Set<string>([
    setup.biome,
    ...[...setup.player, ...setup.enemy].map((pawn) => pawn.kind),
    ...[...tiles.values()].flatMap((tile) => [tile.terrain, tile.feature ?? '']),
  ])
  const fresh = Object.keys(INTRODUCTIONS).filter(
    (tag) => present.has(tag) && !introduced.has(tag),
  )
  for (const tag of fresh) introduced.add(tag)
  return { ...level, setup, newElements: fresh.flatMap((tag) => INTRODUCTIONS[tag]) }
})

export const CAMPAIGN_STORAGE_KEY = 'hexmate:campaign:v1'

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
