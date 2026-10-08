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

const HAPTICS_KEY = 'hexmate.haptics'

export function readHapticsEnabled(): boolean {
  try {
    return localStorage.getItem(HAPTICS_KEY) !== 'false'
  } catch {
    return true
  }
}

export function saveHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_KEY, String(enabled))
  } catch {
    // localStorage unavailable: the preference only lasts until the page is left
  }
}

export function clearAllData(): void {
  try {
    localStorage.clear()
  } catch {
    // localStorage unavailable: nothing persisted, nothing to clear
  }
}

const DEVELOPER_PREVIEW_KEY = 'hexmate.developerPreview'

export function readDeveloperPreview(): boolean {
  try {
    return localStorage.getItem(DEVELOPER_PREVIEW_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveDeveloperPreview(enabled: boolean): void {
  try {
    localStorage.setItem(DEVELOPER_PREVIEW_KEY, String(enabled))
  } catch {
    // localStorage unavailable: the preview stays off after a reload
  }
}
