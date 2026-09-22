import { createFileRoute, Outlet } from '@tanstack/react-router'
import type { GameMode } from '../lib/game-mode'

export const Route = createFileRoute('/game')({
  validateSearch: (search: Record<string, unknown>): { mode: GameMode } => ({
    mode: search.mode === 'local' ? 'local' : 'ai',
  }),
  component: Outlet,
})
