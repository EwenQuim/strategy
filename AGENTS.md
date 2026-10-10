# Hexmate

Mobile-first 2D turn-based hexagonal strategy game. React + Vite + TanStack Router (file-based routing) + Tailwind v4 client in `client/`, Go server in `server/`.

## Design goals

Every feature must make the game fun and strategic, never static or boring. Battles should feel tense: reward mobility, risk and bold plays, not turtling or waiting. When a rule could go either way, pick the one that keeps units moving and decisions nervous, e.g. a buff that follows a unit instead of pinning it in place.

## Constraints

- Mobile-first: every change must work on a small portrait screen. The game screen is one fixed viewport (top info banner, board, bottom action banner), no scrolling.
- Prioritize space for the grid: keep top information and bottom actions compact, remove redundant instructions, and show battle history as transient overlays rather than permanent panels.
- Game logic is plain TypeScript in `client/src/lib/engine/` (hex math, pawn classes, reducer), pure and framework-free. Routes only render it.
- Each pawn type lives in its own file in `client/src/lib/engine/pawns/` (class extending `Pawn`, its icon path and its special ability). Register it in `PAWN_CLASSES` in `pawns/index.ts`; every class except the king and the spawn-only units filtered out of `RECRUIT_CLASSES` is recruitable. UI hints come from ability fields (`targetLabel`, `prompt`, `noTargets`), not `kind` checks.
- Each biome lives in its own file in `client/src/lib/engine/biomes/` (terrain generation, theme CSS variables). Register it in `BIOMES` in `biomes/index.ts`; the game screen applies `theme` as inline CSS variables, and display names come from `i18n/biomes.ts`.
- Each AI strategy lives in its own file in `client/src/lib/engine/ai/strategies/` implementing `AiStrategy`; register it in `STRATEGIES` in `ai/decision.ts`, the only place strategies are linked.
- Tile highlighting (reachable / attackable) changes the polygon fill color, never the border.
- Prefer avoiding `useEffect`: when reactive state can do the job — a lazy `useState` initializer instead of a mount read, or state moved up, into Context, or into a separate hook — code it that way, and prefer CSS keyframes over effect-driven animation. Keep the effects that are necessary reactions to external systems (storage, subscriptions, timers, imperative DOM APIs); never route side effects through reducers to dodge an effect. When touching code that has one, try to remove it by coding differently.
- UI text lives in `client/src/i18n/`: one exported `t({ en, fr, de, es, it })` constant per message, imported as `import * as m from '../i18n/<area>'`. Use `plural()` for count-dependent words. A missing locale or unknown key fails `tsc`; an unused message fails knip. Engine display text (unit and ability names, biomes, tile features, terrain, campaign and level names) lives in i18n maps keyed by stable ids; ability text fields hold `SpecialTextKey` message keys resolved through `i18n/units.ts`. The battle log is the only engine text still untranslated.

## Styling

- Default to Tailwind utilities in JSX for layout, spacing, typography, colors, responsive behavior, and simple interaction states. Put utilities on the element they style where practical.
- Reserve native CSS in `client/src/index.css` for keyframes and their animation bindings, plus global base rules and theme tokens. Even animated components should use Tailwind for positioning, colors, gradients, SVG styling, and simple transitions. Keep animation class names feature-scoped, such as `combat-feedback--hit` and `pawn-fall`.
- Chrome cannot composite animations on elements inside an `<svg>`, whatever the property: every frame of any CSS animation or transition in the battlefield repaints the whole board, and Android drops frames. Never put infinite animations or per-tile transitions there; keep in-board motion short-lived and limited to a few elements (pawn moves, combat effects). Opacity/transform animations are only cheap on HTML elements.
- Do not wrap simple components in semantic CSS classes or `@apply` rules. Reuse small Tailwind class strings when the same control styling is repeated. Keep full utility names literal so Tailwind can detect them.
- Use Tailwind responsive and `motion-reduce:` variants, not hand-written CSS media queries or custom viewport aliases. Preserve existing width thresholds with `min-[900px]:`, `max-[601px]:`, and `max-[360px]:`; use arbitrary media variants for height and compound conditions. Test overlapping width/height conditions when changing responsive styles.
- Reuse the theme colors (`text-ink`, `text-muted`, `text-gold`, `border-line`). Preserve safe-area insets, reduced-motion behavior, and the fixed game viewport.
- Keep inline styles for runtime-computed values such as pawn coordinates. Browser tests should use roles/accessible names or stable data attributes, not Tailwind utility strings or obsolete CSS classes.

## Commands

Use the `Makefile` targets; it is the source of truth for setup, dev, format, lint, typecheck, and tests. Toolchain versions are pinned in `.github/workflows/ci.yml`. The pre-push hook (`.githooks/pre-push`) only runs fast checks; slow bot sweeps in `client/tests/integration` run in CI.

Tests encode gameplay. Editing an existing test to make a change pass is a red flag: it may hide an unintended gameplay change, so flag it and get the change confirmed instead of adjusting the test silently.

## Boundaries

- `client/src/lib/engine/`: deterministic game rules. `reducer(state, action)` applies an action for whichever side owns the active pawn; it never runs a bot or mutates its input.
- `client/src/lib/engine/bot.ts`: the single-player controller. It only proposes ordinary actions; `useGame` plays them through the playback reducer like human actions.
- `client/src/lib/playback.ts`: pure playback state and input locking.
- `client/src/useGame.ts`, routes, and components: React, browser timers, reduced-motion preferences, and rendering.

The library is checked without DOM or Node globals and cannot import runtime packages or files outside `client/src/lib/`. Seeded randomness is stored in game state; the engine does not read clocks or global randomness. Networking and serialization belong in adapters, not in the rules engine.

## Authored battle setups

`FixedBattleSetup` (a literal map plus both armies) and `validateSetup`, which decides what is accepted, live in `client/src/lib/engine/setup.ts`. Map symbols are the `terrainSymbols` and `featureSymbols` tables in `engine/mapRows.ts`, with `_` for absent tiles. Invalid maps and placements are rejected, never silently moved or regenerated. The seed only drives initiative and combat rolls, so the same actions replay deterministically.

Walking and Charge cannot cross absent tiles; ranged attacks, spells, and Ninja jumps use hex distance and can. Terrain never blocks ranged attacks or spells. Keep maps compact for readable tiles on portrait screens.

## Campaign

Each campaign pack is one JSON file in `client/src/lib/campaigns/`, loaded by `client/src/lib/campaign.ts`, which also holds unlock rules and the localStorage keys. Terrain and positions are always authored, never generated at runtime. Integration tests require a reproducible player victory for every level, so run `make test-integration` after editing a level.

The one-level tutorial pack comes first: until any campaign victory, the home button plays it directly and the campaign list stays hidden. Levels unlock one by one in every pack; the Developer preview setting opens them all.

Campaigns flagged `developerPreview` are listed and reachable only while the Developer preview setting is on.

## Achievements

Rules live in `client/src/lib/achievements.ts` and read the battle history the engine keeps in `GameState` (`blows`, `escapes`), so they work the same for replayed, restored and online battles. Only the viewer's victories count, never local two-player games. Achievements are badges: they may unlock cosmetics later, never gameplay advantages.

## Online synchronization

The game page opens one SSE stream per game for both the waiting room and the battle; moves use the version-checked POST endpoint. Every connection sends the full public snapshot, so reconnecting needs no event replay. Server heartbeats renew write deadlines and a client watchdog replaces stalled streams; reverse proxies must not buffer responses and need an idle timeout longer than the heartbeat.

Subscribers are notified in-process after the storage write succeeds, so running several server instances would require cross-instance notifications. `make pvp` runs the server on two origins for local two-player testing.

## Offline play

Development mode does not register a service worker. A downloaded update never reloads a running match; it activates only once every Hexmate client is closed, and old assets are removed only after activation. Offline and campaign battles snapshot the current state to a single `localStorage` key (`client/src/battleStorage.ts`) and restore it on reload, so refreshing resumes the battle and starting a different battle overwrites it. Online battles resync from the server snapshot instead.
