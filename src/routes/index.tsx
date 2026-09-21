import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Hex Strategy</h1>
      <p className="mt-2 text-neutral-400">A 2D turn-based hexagonal strategy game draft.</p>
      <Link
        to="/game"
        className="mt-4 inline-block rounded bg-sky-700 px-5 py-3 text-base font-medium touch-manipulation"
      >
        Start the game
      </Link>
    </main>
  ),
})
