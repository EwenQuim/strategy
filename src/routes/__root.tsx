import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-dvh bg-neutral-900 text-neutral-100">
      <nav className="bg-neutral-800 p-2 text-sm">
        <Link to="/" className="mr-4 text-sky-400">
          Home
        </Link>
        <Link to="/game" className="text-sky-400">
          Game
        </Link>
      </nav>
      <Outlet />
    </div>
  ),
})
