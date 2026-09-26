const SYMMETRIC_KEY = 'hexmate.custom.symmetric'

export function readSymmetricPreference(): boolean {
  try {
    return localStorage.getItem(SYMMETRIC_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveSymmetricPreference(symmetric: boolean): void {
  try {
    localStorage.setItem(SYMMETRIC_KEY, String(symmetric))
  } catch {
    // localStorage unavailable: preference only lasts until the custom screen is left
  }
}
