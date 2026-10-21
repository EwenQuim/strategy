import { readLocal, saveLocal } from './storage.ts'
import { RECRUIT_CLASSES, type PawnKind } from './lib/engine/index.ts'
import type { StoredGame } from './lib/online.ts'
import { STARTER_RECRUITS } from './campaign.ts'
import { readUnlockedUnits } from './unitProgress.ts'

const NAME_KEY = 'hexmate.online.name'
const GAMES_KEY = 'hexmate.online.games'
const PUBLIC_KEY = 'hexmate.online.public'

export function readPlayerNameOrDefault(): string {
  const name = readLocal(NAME_KEY, '', (raw) => raw)
  if (name) return name
  const generated = `Player ${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`
  savePlayerName(generated)
  return generated
}

export function savePlayerName(name: string): void {
  saveLocal(NAME_KEY, name)
}

export function readPublicHosting(): boolean {
  return readLocal(PUBLIC_KEY, true, (raw) => raw === 'true')
}

export function savePublicHosting(publicHosting: boolean): void {
  saveLocal(PUBLIC_KEY, String(publicHosting))
}

export function readStoredGames(): StoredGame[] {
  return readLocal(GAMES_KEY, [], (raw) => {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (game): game is StoredGame =>
        typeof game === 'object' &&
        game !== null &&
        typeof (game as StoredGame).code === 'string' &&
        typeof (game as StoredGame).token === 'string' &&
        ((game as StoredGame).side === 'player' || (game as StoredGame).side === 'enemy'),
    )
  })
}

export function saveStoredGame(game: StoredGame): void {
  const games = readStoredGames().filter((stored) => stored.code !== game.code)
  saveLocal(GAMES_KEY, JSON.stringify([game, ...games]))
}

const ROSTER_KEY = 'hexmate.online.roster'
const starterRoster = [...STARTER_RECRUITS]
const recruitKinds = new Set(RECRUIT_CLASSES.map((Unit) => new Unit(0, 0, 0, 'player').kind))

export function readOnlineRoster(): PawnKind[] {
  return readLocal(ROSTER_KEY, starterRoster, (raw) => {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return starterRoster
    return [...new Set(parsed)]
      .filter((kind): kind is PawnKind => recruitKinds.has(kind as PawnKind))
      .slice(0, 5)
  }).filter((kind) => readUnlockedUnits().includes(kind))
}

export function saveOnlineRoster(roster: PawnKind[]): boolean {
  return saveLocal(ROSTER_KEY, JSON.stringify(roster))
}
