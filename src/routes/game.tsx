import { createFileRoute, Outlet } from '@tanstack/react-router'
import { parseGameSearch } from '../lib/game-mode'

export const Route = createFileRoute('/game')({
  validateSearch: parseGameSearch,
  component: Outlet,
})
