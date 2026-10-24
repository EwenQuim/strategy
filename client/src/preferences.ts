import { readLocal, saveLocal } from './storage.ts'
import { teamColor, TEAM_COLORS, type TeamColor } from './lib/cosmetics.ts'

const TEAM_COLOR_KEY = 'hexmate.teamColor'

export function readTeamColor(): TeamColor {
  return teamColor(readLocal(TEAM_COLOR_KEY, TEAM_COLORS[0].id, (raw) => raw))
}

export function saveTeamColor(id: string): boolean {
  return saveLocal(TEAM_COLOR_KEY, id)
}

const SYMMETRIC_KEY = 'hexmate.custom.symmetric'

export function readSymmetricPreference(): boolean {
  return readLocal(SYMMETRIC_KEY, false, (raw) => raw === 'true')
}

export function saveSymmetricPreference(symmetric: boolean): void {
  saveLocal(SYMMETRIC_KEY, String(symmetric))
}

const HAPTICS_KEY = 'hexmate.haptics'

export function readHapticsEnabled(): boolean {
  return readLocal(HAPTICS_KEY, true, (raw) => raw !== 'false')
}

export function saveHapticsEnabled(enabled: boolean): void {
  saveLocal(HAPTICS_KEY, String(enabled))
}

const DEVELOPER_PREVIEW_KEY = 'hexmate.developerPreview'

export function readDeveloperPreview(): boolean {
  return readLocal(DEVELOPER_PREVIEW_KEY, false, (raw) => raw === 'true')
}

export function saveDeveloperPreview(enabled: boolean): void {
  saveLocal(DEVELOPER_PREVIEW_KEY, String(enabled))
}

const SERVER_URL_KEY = 'hexmate.serverUrl'

export function readServerUrl(): string {
  return readLocal(SERVER_URL_KEY, '', normalizeServerUrl)
}

export function saveServerUrl(url: string): void {
  saveLocal(SERVER_URL_KEY, normalizeServerUrl(url))
}

// The empty string means the app's own origin.
function normalizeServerUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  try {
    const protocol = new URL(trimmed).protocol
    return protocol === 'http:' || protocol === 'https:' ? trimmed : ''
  } catch {
    return ''
  }
}
