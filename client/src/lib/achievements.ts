import { key, type GameState, type PawnKind, type Side } from './engine/index.ts'

export const ACHIEVEMENTS = [
  { id: 'cleanHands', logo: '🗡️' },
  { id: 'reaper', logo: '🌾' },
  { id: 'ninjaRegicide', logo: '🥷' },
  { id: 'nobodyLeftBehind', logo: '🛡️' },
  { id: 'doneRight', logo: '👑' },
  { id: 'partyOfOne', logo: '🧍' },
  { id: 'thread', logo: '🩸' },
  { id: 'glassCannon', logo: '💥' },
  { id: 'rageQuit', logo: '😤' },
  { id: 'chainReaction', logo: '🔥' },
  { id: 'floorIsLava', logo: '🌋' },
  { id: 'towerCamper', logo: '🎯' },
  { id: 'untouchable', logo: '🎲' },
  { id: 'speedrun', logo: '⚡' },
  { id: 'dogs', logo: '🐺' },
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id']

export function earnedAchievements(state: GameState, me: Side): AchievementId[] {
  if (state.winner !== me) return []
  const mine = state.pawns.filter((pawn) => pawn.side === me)
  const king = mine.find((pawn) => pawn.kind === 'king')!
  const fallen = state.blows.flatMap((blow) => blow.fallen)
  const foesFallen = fallen.filter((unit) => unit.side !== me)
  const myRoster = new Set<PawnKind>([
    ...mine.map((pawn) => pawn.kind),
    ...fallen.filter((unit) => unit.side === me).map((unit) => unit.kind),
  ])
  const myBlows = state.blows.flatMap(({ by, fallen }) =>
    by?.side === me ? [{ by, kills: fallen.filter((unit) => unit.side !== me) }] : [],
  )
  const regicide = myBlows.find(({ kills }) => kills.some((unit) => unit.kind === 'king'))
  const killsBy = new Map<number, number>()
  for (const { by, kills } of myBlows)
    killsBy.set(by.id, (killsBy.get(by.id) ?? 0) + kills.length)
  const rules: Record<AchievementId, boolean> = {
    cleanHands: foesFallen.length === 1,
    reaper: foesFallen.length >= 10,
    ninjaRegicide: regicide?.by.kind === 'ninja',
    nobodyLeftBehind:
      foesFallen.length + state.pawns.length - mine.length >= 5 &&
      fallen.length === foesFallen.length,
    doneRight: regicide?.by.kind === 'king',
    partyOfOne: mine.length === 1,
    thread: king.hp === 1,
    glassCannon: myBlows.some(
      ({ by }) => by.kind === 'ninja' && (killsBy.get(by.id) ?? 0) >= 3,
    ),
    rageQuit: myBlows.some(
      ({ by, kills }) => by.kind === 'berserker' && by.hp === 1 && kills.length > 0,
    ),
    chainReaction: myBlows.some(
      ({ by, kills }) =>
        by.special && (by.kind === 'magician' || by.kind === 'bomber') && kills.length >= 3,
    ),
    floorIsLava: state.tiles.get(key(king.q, king.r))?.terrain === 'lava',
    towerCamper: myBlows.some(
      ({ by, kills }) =>
        by.kind === 'archer' && by.special && by.watchtower && kills.length > 0,
    ),
    untouchable:
      state.escapes.filter((unit) => unit.side === me && unit.kind === 'king').length >= 3,
    speedrun: state.round <= 3,
    dogs:
      myRoster.has('wolf') && [...myRoster].every((kind) => kind === 'king' || kind === 'wolf'),
  }
  return ACHIEVEMENTS.map(({ id }) => id).filter((id) => rules[id])
}
