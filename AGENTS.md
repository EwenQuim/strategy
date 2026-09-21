# Hex Strategy

Mobile-first 2D turn-based hexagonal strategy game. React + Vite + TanStack Router (file-based routing) + Tailwind v4.

## Constraints

- Mobile-first: every change must work on a small portrait screen. The game screen is one fixed viewport (top info banner, board, bottom action banner), no scrolling.
- Prioritize space for the grid: keep top information and bottom actions compact, remove redundant instructions, and show battle history as transient overlays rather than permanent panels.
- Game logic is plain TypeScript in `src/lib/engine/` (hex math, pawn classes, reducer), pure and framework-free. Routes only render it.
- Pawn types are TS classes extending `Pawn` in `src/lib/engine/pawns.ts` (`Swordsman`, `King`, `Archer`, `Magician`).
- Tile highlighting (reachable / attackable) changes the polygon fill color, never the border.
