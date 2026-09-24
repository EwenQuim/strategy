# Hexmate

Mobile-first, turn-based hex strategy game built with React, Vite, TanStack Router, and Tailwind CSS.

## Development

Use Node.js 22 (22.12 or newer), npm, and Google Chrome. The PWA browser checks use the same Chrome channel locally and on the GitHub-hosted Ubuntu runner.

```sh
make onboarding
make dev
```

The frontend lives in `client/`; every npm script runs there, and the `make` targets invoke them for you. The app runs under `/strategy/`. Game URLs contain a seed: the same seed and actions reproduce the same battle.

## Checks

- `make format`: format source and configuration with Prettier.
- `make typecheck`: strict TypeScript checks for the app, library, tooling, and tests.
- `make lint`: typecheck, formatting validation, and Oxlint with no warnings allowed.
- `make test`: run the Node.js built-in test runner; no browser or test framework required.
- `make check`: run `npm run test:ci`: formatting, lint, typechecks, all unit tests, integration tests, and the production build.
- `npm run test:pwa`: test the existing build in Chrome at a small portrait viewport, including offline play, safe upgrades, and failed downloads.

`.githooks/pre-push` runs `npm run typecheck` and the fast unit suite (`npm test`) so pushing stays quick; the slow exhaustive bot sweeps live in `client/tests/integration` and run in CI, not on push. `npm run prepare` installs the hook locally. The full gate lives in CI: `npm run test:ci` plus a browser smoke job (`npm run test:pwa:smoke`, which skips the slow full-battle animation, local multiplayer, and campaign scenarios), run against a fresh locked install with a clean tracked diff and a four-minute job timeout. The slow browser scenarios remain available through `npm run test:pwa`.

The same checks gate pull requests and GitHub Pages deployment. The build includes a `404.html` fallback for seeded game URLs.

## Online synchronization

The game page opens one SSE connection at `/api/games/{code}/events` for both the waiting room and the battle. Moves still use the version-checked POST endpoint. Every connection sends the complete public game snapshot, including the action log, so reconnecting catches up without event replay or `Last-Event-ID` bookkeeping.

The browser's native `EventSource` retries dropped connections after two seconds. The server sends a heartbeat every 15 seconds; a 45-second client watchdog replaces silently stalled streams. Returning online or foregrounding the tab reconnects immediately. Leaving the game or receiving its confirmed finished state closes the stream and its timers.

Responses disable caching, transformations, and nginx buffering. Configure other reverse proxies to stream responses without buffering and use an idle timeout longer than 15 seconds. Server write deadlines are renewed on each heartbeat instead of ending every stream at Fuego's default 30-second timeout.

The server checks the store once per second per connection and only sends changed snapshots. This preserves the two-process, shared-SQLite Docker setup; it removes browser polling, not database polling. An in-process broadcast alone would miss the other instance's moves. Games survive server restarts only when `DB_PATH` is configured.

## Offline play and installation

Open the production site once online, then use your browser's Install app or Add to Home Screen command. The app caches its HTML, styles, icons, and every JavaScript chunk, so new seeded games also work offline. Development mode does not register a service worker.

Updates are checked when the app opens, comes online, or returns to the foreground. A new build downloads in the background, but never reloads a running match. An "Update ready" notice appears once the full release is cached, including when reopening a page with an update already waiting. Finish your match, close all Hexmate browser tabs and app windows, then reopen to activate the update. Refreshing or just backgrounding the installed app is not enough while a client remains open. Old assets are removed only after activation; a failed download leaves the previous version usable offline.

Battles still live in memory: reloading restarts the seeded battle. Offline support does not add saved matches.

## Authored battle setups

Campaign encounters can supply a plain, JSON-compatible setup instead of random mirrored armies:

```ts
import { initialState, type FixedBattleSetup } from 'client/src/lib/engine/index.ts'

const setup = {
  biome: 'mountains',
  map: [
    '........',
    '........',
    '........',
    '........',
    '........',
    '^^^.^^^^',
    '^^^.^^^^',
    '........',
    '........',
    '........',
    '........',
    '........',
  ],
  player: [
    { kind: 'king', col: 3, row: 10 },
    { kind: 'archer', col: 2, row: 7 },
  ],
  enemy: [
    { kind: 'king', col: 3, row: 1 },
    { kind: 'archer', col: 2, row: 4 },
  ],
} as const satisfies FixedBattleSetup

const battle = initialState('campaign-01', setup)
```

Each map has 12 rows of 8 terrain symbols: `.` plain, `f` forest, `^` mountain, `~` lake, and `s` sand. Pawn `col` and `row` are zero-based: column 0 is the left edge, row 0 is the top; odd rows are offset half a hex to the right. Each side must have exactly one king and 1 to 24 units. Pawns can start anywhere on the board, but every starting tile must be distinct and passable. Invalid maps and placements are rejected, never silently moved or regenerated.

Authored maps and positions are loaded literally from the setup, independently of the seed. The biome controls the visual theme, not which terrain can appear. The seed controls initiative and combat rolls; the same actions still replay deterministically. Restart restores an independent copy of the full map and formation, even after units die or the caller edits the original data. Seed-only games and roster-only setups retain their existing generated maps and deployments.

Level 6, High Pass, demonstrates a two-row mountain wall with a narrow opening: walking units must use the pass, while archers can shoot across the mountains.

Random maps can also use the volcano biome, Ember Caldera: basalt ground with passable lava pools. Lava deals 1 unavoidable damage per tile entered, including walking and Charge; Jump only triggers the landing tile. A lethal crossing ends the unit's turn, or the battle if it kills a king. Movement chooses a shortest survivable route, preferring less lava on equally short paths. Deserts contain small lakes and rare, purely decorative palms.

Generated maps have no special tiles 50% of the time, one 40%, and two 10%. These tiles are restricted to rows 6 and 7 (zero-based rows 5 and 6), never overlap hazards or starting units, and use distinct types:

- Watchtower: +1 maximum basic-attack range for Archers and Magicians, without changing minimum range or specials.
- Healing spring: +1 health, capped at maximum, at a unit's next activation after staying on it. Leaving cancels the pending healing.
- Power rune: consumed on entry for +2 energy usable in the current round only. Normal energy capacity returns next round.

Authored maps additionally accept `p` (decorative palm), `b` (basalt), `l` (lava), `W` (watchtower), `H` (healing spring), and `R` (power rune). Special symbols sit on plain ground and obey the same two-tile, center-row limit. Their ground color follows the biome.

The same optional setup is accepted by bot `initialState(seed, setup)` / `initialTransition(seed, setup)`, `initialPlayback(seed, mode, setup)`, and `useGame(seed, mode, setup)`. Campaign routes pass their encounter directly and remount the game between levels. Custom setups are not encoded in the existing random-game URLs.

## Campaign

Choose Campaign on the home screen to play 20 authored AI encounters. The opening is a swordsman-and-king patrol on open ground, not a full-roster battle. Archers arrive in level 2, lakes in 3, directional Fireball in 4, the watchtower in 5, mountains in 6, range-2 Protect in 7, and friendly-fire bombs in 8. Lava arrives in level 9; the open desert and your first ninja arrive in 11.

Later encounters test combinations rather than just adding enemies: Twin Daggers threatens two flanks, Iron Caravan is a two-bomber ambush, Wizard Curtain places four aligned casters between your flanking squads, and Forked Gate offers a watchtower route or a healing-spring route. Caldera Run combines safe landings, enemy assassins, and contested energy. The final two battles bring all seven player classes together. Terrain never blocks ranged attacks or spells.

Volcanic encounters remain levels 9, 15, and 18. Features are introduced separately, then reused: watchtowers first appear in 5, healing springs in 14, and power runes in 15. Later maps combine at most two features, all reachable without crossing lava. Difficulty comes from formations, terrain, and unit combinations; campaign AI stays on normal. Integration tests require a reproducible player victory for every encounter, trying aggressive and cautious hard-bot playstyles.

Level 1 starts unlocked; winning unlocks the next level. Existing saved progress is preserved. Completed levels can be replayed, and losing or leaving a battle does not reset progress.

Completed levels are stored in localStorage under `hexmate:campaign:v1`, so progress survives reloads and works offline on the same browser and device. Clearing site data removes that progress; there is no cloud sync or saved in-progress battle. If storage is blocked or full, a warning appears after victory and progress lasts for the current tab only.

All 20 level definitions live in `client/src/lib/campaign-levels.json`. Each level explicitly includes its ID, name, seed, biome, full terrain map, and both armies as `{ kind, col, row }` entries, including both kings. Edit that single JSON file to design terrain lines and starting formations; campaign terrain and positions are never randomly generated at runtime. `client/src/lib/campaign.ts` imports those levels and contains the progression helpers.

The selector is at `/strategy/campaign` and battles at `/strategy/campaign/1` through `/strategy/campaign/20`. Locked and invalid battle URLs return to the selector.

## Boundaries

- `client/src/lib/engine/`: deterministic game rules. `initialState(seed)` creates an untouched battle; `reducer(state, action)` applies an action for whichever side owns the active pawn. It never runs a bot or mutates its input. `transition` additionally returns effect snapshots before turn advancement or the victory screen.
- `client/src/lib/bot.ts`: the optional single-player controller. It proposes ordinary actions and applies them through the same engine as human actions. The existing nearest-target and king-hunting strategies remain interchangeable.
- `client/src/lib/playback.ts`: pure playback state and input locking.
- `client/src/useGame.ts`, routes, and components: React, browser timers, reduced-motion preferences, and rendering.

The library is checked without DOM or Node globals and cannot import runtime packages or files outside `client/src/lib/`. Seeded randomness is stored in game state; the engine does not read clocks or global randomness.

A local two-player controller can use the engine directly. Networking, action authorization, and serialization of Maps and pawn class instances belong in a future adapter, not in the rules engine.
