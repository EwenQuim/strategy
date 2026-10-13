import { readLocal, saveLocal } from './storage.ts'
import type { StoredGame } from './lib/online.ts'

const NAME_KEY = 'hexmate.online.name'
const GAMES_KEY = 'hexmate.online.games'
const PUBLIC_KEY = 'hexmate.online.public'

export function readPlayerName(): string {
  return readLocal(NAME_KEY, '', (raw) => raw)
}

export function savePlayerName(name: string): void {
  saveLocal(NAME_KEY, name)
}

export function readPublicHosting(): boolean {
  return readLocal(PUBLIC_KEY, false, (raw) => raw === 'true')
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
