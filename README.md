# Hexmate

Mobile-first, turn-based hexagonal strategy game. Play directly in the browser, offline, or installed as an app.

**Play now: [strategy.glenan.quimerch.com](https://strategy.glenan.quimerch.com)**

## Game modes

- **Versus AI**: pick a bot difficulty and fight on a randomly generated, mirrored battlefield.
- **Campaign**: authored encounters that introduce terrain, special tiles, and unit combinations one at a time. Finishing it unlocks harder packs, and enough victories unlock story packs. Progress is saved per browser.
- **Local multiplayer**: two players on the same device.
- **Online multiplayer**: share a game code; moves and battle state sync live.

## The battlefield

Battles unfold on a hexagonal grid with terrain such as forests, mountains, lakes, and lava, plus special tiles like watchtowers, healing springs, and power runes. Every unit class has its own special ability. Every battle URL contains a seed: the same seed and the same actions always reproduce the same battle, so matches can be shared and replayed.

## Install and offline play

Open the site once online, then use your browser's **Install app** or **Add to Home Screen** command. Seeded games then work fully offline. Updates download in the background and apply once the app is closed and reopened, never during a running match.

## For developers and contributors

Run `make onboarding` then `make dev`; the `Makefile` lists every other target. Architecture and conventions live in [AGENTS.md](AGENTS.md).
