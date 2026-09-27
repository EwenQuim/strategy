# Hexmate

Mobile-first, turn-based hexagonal strategy game. Play directly in the browser, offline, or installed as an app.

**Play now: [ewen.quimerch.com/strategy](http://ewen.quimerch.com/strategy/)**

## Game modes

- **Versus AI** — three bot difficulties on random or mirrored battlefields.
- **Campaign** — 20 authored encounters that introduce terrain, special tiles, and unit combinations, one feature at a time. Finishing it unlocks the Brutal and Shattered Crown packs; enough victories unlock two story packs. Progress is saved per browser.
- **Local multiplayer** — two players on the same device.
- **Online multiplayer** — share a game code; moves and battle state sync live.

## The battlefield

Battles unfold on a hexagonal grid with terrain (forest, mountains, lakes, sand, lava) and special tiles: watchtowers, healing springs, and power runes. Every battle URL contains a seed — the same seed and the same actions always reproduce the same battle, so matches can be shared and replayed.

Seven unit classes, each with its own special ability: King, Swordsman, Archer, Magician, Ninja, Bulwark, and Bomber.

Available in English, French, German, Spanish, and Italian.

## Install and offline play

Open the site once online, then use your browser's **Install app** or **Add to Home Screen** command. The app caches everything it needs, so seeded games work fully offline. Updates download in the background and apply the next time you open the app — never during a running match.

## For developers and contributors

- Node.js 22 (22.12 or newer) and npm.
- `make onboarding` — install dependencies and verify the environment.
- `make dev` — run the app locally under `/strategy/`.
- `make check` — formatting, lint, typechecks, unit tests, and the production build.
- `make test-integration` — AI battle suite: bot sweeps and campaign winnability.

Architecture, conventions, and the full development guide live in [AGENTS.md](AGENTS.md).
