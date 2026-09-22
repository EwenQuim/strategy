# Hex Strategy

Mobile-first, turn-based hex strategy game built with React, Vite, TanStack Router, and Tailwind CSS.

## Development

Use Node.js 22 (22.12 or newer), npm, and Google Chrome. The PWA browser checks use the same Chrome channel locally and on the GitHub-hosted Ubuntu runner.

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
- `make check`: run all checks, engine tests, the production build, and PWA browser tests.
- `npm run test:pwa`: test the existing build in Chrome at a small portrait viewport, including offline play, safe upgrades, and failed downloads.

CI and `.githooks/pre-push` both run `npm run check:ci`: a fresh locked install with lifecycle scripts disabled, all checks, and a clean tracked diff. `npm run prepare` installs the hook locally, including when automatic npm lifecycle scripts are disabled. The hook rejects uncommitted or untracked changes so checks run against the code being pushed.

The same checks gate pull requests and GitHub Pages deployment. The build includes a `404.html` fallback for seeded game URLs.

## Offline play and installation

Open the production site once online, then use your browser's Install app or Add to Home Screen command. The app caches its HTML, styles, icons, and every JavaScript chunk, so new seeded games also work offline. Development mode does not register a service worker.

Updates are checked when the app opens, comes online, or returns to the foreground. A new build downloads in the background, but never reloads a running match. An "Update ready" notice appears once the full release is cached, including when reopening a page with an update already waiting. Finish your match, close all Hex Strategy browser tabs and app windows, then reopen to activate the update. Refreshing or just backgrounding the installed app is not enough while a client remains open. Old assets are removed only after activation; a failed download leaves the previous version usable offline.

Battles still live in memory: reloading restarts the seeded battle. Offline support does not add saved matches.

## Authored battle setups

Campaign encounters can supply a plain, JSON-compatible setup instead of random mirrored armies:

```ts
import { initialState, type BattleSetup } from './src/lib/engine/index.ts'

const setup = {
  biome: 'desert',
  player: ['king', 'swordsman', 'archer'],
  enemy: ['king', 'swordsman', 'swordsman', 'magician', 'ninja'],
} as const satisfies BattleSetup

const battle = initialState('campaign-01', setup)
```

The array lengths determine the number of units, including each king. Repeating a class recruits multiple units of that class. Each side must have exactly one king and 1 to 24 units, matching its three-row deployment area. Invalid setups throw before creating a battle.

The same seed and setup reproduce terrain, deployment positions, initiative, and combat rolls for the same actions. Spawn positions are still seed-generated, not hand-placed. The engine copies the setup into the battle so restart restores the authored encounter even after units die or the caller edits its original setup. Omitting the setup keeps existing random games and their seeded results unchanged.

The same optional setup is accepted by bot `initialState(seed, setup)` / `initialTransition(seed, setup)`, `initialPlayback(seed, mode, setup)`, and `useGame(seed, mode, setup)`. Campaign routes pass their encounter directly and remount the game between levels. Custom setups are not encoded in the existing random-game URLs.

## Campaign

Choose Campaign on the home screen to play 20 fixed AI encounters across all three biomes. Level 1 starts unlocked; winning unlocks the next level. Completed levels can be replayed, and losing or leaving a battle does not reset progress.

Completed levels are stored in localStorage under `hex-strategy:campaign:v1`, so progress survives reloads and works offline on the same browser and device. Clearing site data removes that progress; there is no cloud sync or saved in-progress battle. If storage is blocked or full, a warning appears after victory and progress lasts for the current tab only.

Level definitions live in `src/lib/campaign.ts`; the selector is at `/strategy/campaign` and battles at `/strategy/campaign/1` through `/strategy/campaign/20`. Locked and invalid battle URLs return to the selector.

## Boundaries

- `src/lib/engine/`: deterministic game rules. `initialState(seed)` creates an untouched battle; `reducer(state, action)` applies an action for whichever side owns the active pawn. It never runs a bot or mutates its input. `transition` additionally returns effect snapshots before turn advancement or the victory screen.
- `src/lib/bot.ts`: the optional single-player controller. It proposes ordinary actions and applies them through the same engine as human actions. The existing nearest-target and king-hunting strategies remain interchangeable.
- `src/lib/playback.ts`: pure playback state and input locking.
- `src/useGame.ts`, routes, and components: React, browser timers, reduced-motion preferences, and rendering.

The library is checked without DOM or Node globals and cannot import runtime packages or files outside `src/lib/`. Seeded randomness is stored in game state; the engine does not read clocks or global randomness.

A local two-player controller can use the engine directly. Networking, action authorization, and serialization of Maps and pawn class instances belong in a future adapter, not in the rules engine.
