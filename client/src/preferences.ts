import { readLocal, saveLocal } from './storage.ts'

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
