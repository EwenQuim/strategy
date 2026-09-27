const TUTORIAL_SEEN_KEY = 'hexmate.tutorial-seen'

export function readTutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true'
  } catch {
    return false
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
  } catch {
    // localStorage unavailable: the tutorial shows again on the next quick play
  }
}
