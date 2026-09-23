import type { StoredGame } from './lib/online.ts'

const NAME_KEY = 'hexmate.online.name'
const GAMES_KEY = 'hexmate.online.games'
const FLAG_KEY = 'hexmate.online'

export function onlineEnabled(): boolean {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return false
  try {
    return localStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function readPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // localStorage unavailable: keep working in-memory for the session
  }
}

export function readStoredGames(): StoredGame[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY)
    if (!raw) return []
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
  } catch {
    return []
  }
}

export function saveStoredGame(game: StoredGame): void {
  try {
    const games = readStoredGames().filter((stored) => stored.code !== game.code)
    localStorage.setItem(GAMES_KEY, JSON.stringify([game, ...games]))
  } catch {
    // localStorage unavailable: game only lasts for this tab
  }
}
