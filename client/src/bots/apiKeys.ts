export const MISTRAL_KEY_STORAGE = 'hexmate.mistralApiKey'
export const JEV_KEY_STORAGE = 'hexmate.jevApiKey'

// The player pastes a key in Settings and it lives in localStorage, never in a build.
function readApiKey(storageKey: string): string | undefined {
  try {
    return localStorage.getItem(storageKey) ?? undefined
  } catch {
    // localStorage unavailable: the catalog's local fallback takes over.
  }
  return undefined
}

function saveApiKey(storageKey: string, key: string): void {
  try {
    if (key) localStorage.setItem(storageKey, key)
    else localStorage.removeItem(storageKey)
  } catch {
    // localStorage unavailable: the key only lasts until the page is left.
  }
}

export const readMistralApiKey = (): string | undefined => readApiKey(MISTRAL_KEY_STORAGE)
export const saveMistralApiKey = (key: string): void => saveApiKey(MISTRAL_KEY_STORAGE, key)
export const readJevApiKey = (): string | undefined => readApiKey(JEV_KEY_STORAGE)
export const saveJevApiKey = (key: string): void => saveApiKey(JEV_KEY_STORAGE, key)
