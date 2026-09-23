# Hexmate

Mobile-first 2D turn-based hexagonal strategy game. React + Vite + TanStack Router (file-based routing) + Tailwind v4.

## Constraints

- Mobile-first: every change must work on a small portrait screen. The game screen is one fixed viewport (top info banner, board, bottom action banner), no scrolling.
- Prioritize space for the grid: keep top information and bottom actions compact, remove redundant instructions, and show battle history as transient overlays rather than permanent panels.
- Game logic is plain TypeScript in `client/src/lib/engine/` (hex math, pawn classes, reducer), pure and framework-free. Routes only render it.
- Each pawn type lives in its own file in `client/src/lib/engine/pawns/` (class extending `Pawn`, its icon path and its special ability). Register it in `PAWN_CLASSES` in `pawns/index.ts`; every non-king class is recruitable. UI hints come from ability fields (`targetLabel`, `prompt`, `noTargets`), not `kind` checks.
- Each biome lives in its own file in `client/src/lib/engine/biomes/` (name, description, terrain generation, theme CSS variables). Register it in `BIOMES` in `biomes/index.ts`; the game screen applies `theme` as inline CSS variables.
- Tile highlighting (reachable / attackable) changes the polygon fill color, never the border.

## Styling

- Default to Tailwind utilities in JSX for layout, spacing, typography, colors, responsive behavior, and simple interaction states. Put utilities on the element they style where practical.
- Reserve native CSS in `client/src/index.css` for keyframes and their animation bindings, plus global base rules and theme tokens. Even animated components should use Tailwind for positioning, colors, gradients, SVG styling, and simple transitions. Keep animation class names feature-scoped, such as `combat-feedback--hit` and `pawn-active-halo`.
- Do not wrap simple components in semantic CSS classes or `@apply` rules. Reuse small Tailwind class strings when the same control styling is repeated. Keep full utility names literal so Tailwind can detect them.
- Use Tailwind responsive and `motion-reduce:` variants, not hand-written CSS media queries or custom viewport aliases. Preserve existing width thresholds with `min-[900px]:`, `max-[601px]:`, and `max-[360px]:`; use arbitrary media variants for height and compound conditions. Test overlapping width/height conditions when changing responsive styles.
- Reuse the theme colors (`text-ink`, `text-muted`, `text-gold`, `border-line`). Preserve safe-area insets, reduced-motion behavior, and the fixed game viewport.
- Keep inline styles for runtime-computed values such as pawn coordinates. Browser tests should use roles/accessible names or stable data attributes, not Tailwind utility strings or obsolete CSS classes.
