import type { AchievementId } from './achievements.ts'
import type { Side } from './engine/index.ts'

// Pure cosmetics: re-skin through CSS variables like biome themes; never touch
// engine state.
export interface TeamColor {
  readonly id: string
  // Undefined means always available.
  readonly unlock?: AchievementId
  readonly body: readonly [string, string]
  readonly hp: string
  readonly stroke: string
  readonly accent: string
}

// The default entry mirrors the root palette in index.css.
export const TEAM_COLORS: readonly TeamColor[] = [
  {
    id: 'default',
    body: ['#407265', '#193e35'],
    hp: '#d5deb0',
    stroke: '#b2ceaa',
    accent: '#b6d2b5',
  },
  {
    id: 'crimson',
    unlock: 'reaper',
    body: ['#8a4a52', '#43222a'],
    hp: '#e0bfc2',
    stroke: '#cea0a6',
    accent: '#d6a8ae',
  },
  {
    id: 'azure',
    unlock: 'nobodyLeftBehind',
    body: ['#46688f', '#1f2f47'],
    hp: '#c0d0e4',
    stroke: '#a4bcd6',
    accent: '#b0c6dd',
  },
  {
    id: 'amber',
    unlock: 'speedrun',
    body: ['#8f7440', '#45351c'],
    hp: '#e4d6ae',
    stroke: '#d0bd8e',
    accent: '#d5bd7f',
  },
  {
    id: 'violet',
    unlock: 'glassCannon',
    body: ['#6d4b8f', '#332247'],
    hp: '#d0c2e6',
    stroke: '#b5a2d4',
    accent: '#c0aed9',
  },
  {
    id: 'rose',
    unlock: 'ninjaRegicide',
    body: ['#8f4a6b', '#452234'],
    hp: '#e2c0d0',
    stroke: '#d29eb4',
    accent: '#d8abc2',
  },
]

export type TeamColorId = (typeof TEAM_COLORS)[number]['id']

export function teamColor(id: string): TeamColor {
  return TEAM_COLORS.find((color) => color.id === id) ?? TEAM_COLORS[0]
}

export function teamColorUnlocked(color: TeamColor, earned: readonly AchievementId[]): boolean {
  return color.unlock === undefined || earned.includes(color.unlock)
}

export function teamColorTheme(color: TeamColor, side: Side): Record<`--${string}`, string> {
  return {
    [`--pawn-${side}-start`]: color.body[0],
    [`--pawn-${side}-end`]: color.body[1],
    [`--pawn-${side}-hp`]: color.hp,
    [`--${side}`]: color.accent,
    // Player chips outline with --pawn-stroke, enemy chips with their accent.
    ...(side === 'player' ? { '--pawn-stroke': color.stroke } : {}),
  }
}
