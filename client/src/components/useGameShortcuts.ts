import { useEffect } from 'react'

export interface GameShortcuts {
  endTurn: () => void
  toggleAim: () => void
  cancel: () => void
  toggleThreats: () => void
  help: () => void
}

// Keyboard shortcuts mirror the tap controls; the help dialog lists them.
export function useGameShortcuts({
  endTurn,
  toggleAim,
  cancel,
  toggleThreats,
  help,
}: GameShortcuts) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      // An open dialog handles its own keys, and typing must never trigger commands.
      // A closed dialog's hidden buttons may still hold focus, so only an open one blocks shortcuts.
      if (target?.closest('dialog[open], input, textarea, select, [contenteditable]')) return
      const shortcuts: Record<string, () => void> = {
        e: endTurn,
        a: toggleAim,
        escape: cancel,
        t: toggleThreats,
        h: help,
        '?': help,
      }
      const run = shortcuts[event.key.toLowerCase()]
      if (!run) return
      run()
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [endTurn, toggleAim, cancel, toggleThreats, help])
}
