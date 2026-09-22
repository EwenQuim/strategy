# Hex Strategy

Mobile-first, turn-based hex strategy game built with React, Vite, TanStack Router, and Tailwind CSS.

## Development

Use Node.js 22 (22.12 or newer) and npm.

```sh
npm ci --ignore-scripts
npm run prepare
make dev
```

The app runs under `/strategy/`. Game URLs contain a seed: the same seed and actions reproduce the same battle.

## Checks

- `make format`: format source and configuration with Prettier.
- `make typecheck`: strict TypeScript checks for the app, library, tooling, and tests.
- `make lint`: typecheck, formatting validation, and Oxlint with no warnings allowed.
- `make test`: run the Node.js built-in test runner; no browser or test framework required.
- `make check`: run all checks, tests, and the production build.

CI and `.githooks/pre-push` both run `npm run check:ci`: a fresh locked install with lifecycle scripts disabled, all checks, and a clean tracked diff. `npm run prepare` installs the hook locally, including when automatic npm lifecycle scripts are disabled. The hook rejects uncommitted or untracked changes so checks run against the code being pushed.

The same checks gate pull requests and GitHub Pages deployment. The build includes a `404.html` fallback for seeded game URLs.

## Boundaries

- `src/lib/engine/`: deterministic game rules. `initialState(seed)` creates an untouched battle; `reducer(state, action)` applies an action for whichever side owns the active pawn. It never runs a bot or mutates its input. `transition` additionally returns effect snapshots before turn advancement or the victory screen.
- `src/lib/bot.ts`: the optional single-player controller. It proposes ordinary actions and applies them through the same engine as human actions. The existing nearest-target and king-hunting strategies remain interchangeable.
- `src/lib/playback.ts`: pure playback state and input locking.
- `src/useGame.ts`, routes, and components: React, browser timers, reduced-motion preferences, and rendering.

The library is checked without DOM or Node globals and cannot import runtime packages or files outside `src/lib/`. Seeded randomness is stored in game state; the engine does not read clocks or global randomness.

A local two-player controller can use the engine directly. Networking, action authorization, and serialization of Maps and pawn class instances belong in a future adapter, not in the rules engine.
