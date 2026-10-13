import { readLocal, removeLocal, saveLocal } from '../storage.ts'

export const MISTRAL_KEY_STORAGE = 'hexmate.mistralApiKey'
export const JEV_KEY_STORAGE = 'hexmate.jevApiKey'

// The player pastes a key in Settings and it lives in localStorage, never in a build.
function readApiKey(storageKey: string): string | undefined {
  return readLocal(storageKey, undefined, (raw) => raw)
}

function saveApiKey(storageKey: string, key: string): void {
  if (key) saveLocal(storageKey, key)
  else removeLocal(storageKey)
}

export const readMistralApiKey = (): string | undefined => readApiKey(MISTRAL_KEY_STORAGE)
export const saveMistralApiKey = (key: string): void => saveApiKey(MISTRAL_KEY_STORAGE, key)
export const readJevApiKey = (): string | undefined => readApiKey(JEV_KEY_STORAGE)
export const saveJevApiKey = (key: string): void => saveApiKey(JEV_KEY_STORAGE, key)
