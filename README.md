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

## Android app

The Play Store build is a Trusted Web Activity: a Bubblewrap-generated shell that opens the live site, so game updates ship with web deploys and only shell changes need a new AAB. Building requires a JDK and the Android SDK build tools; npx fetches Bubblewrap itself.

```sh
make android-init    # one-time, interactive: creates the upload keystore and twa-manifest.json
make android-build   # builds app-release-signed.aab for the Play Console
make android-doctor  # verifies the deployed assetlinks.json against twa-manifest.json
```

The keystore, AAB, and twa-manifest.json are gitignored. Losing the keystore forces a new app identity, so back it up outside the repo.

After the first upload, copy the app signing key's SHA-256 fingerprint (Play Console, Release setup, App signing) into `client/public/.well-known/assetlinks.json` and redeploy: the server serves it at the origin root as `/.well-known/assetlinks.json`, proving the app owns the origin. Until the real fingerprint is deployed, the installed app opens with a Chrome URL bar. These targets run locally on purpose: the signing key must be generated and stored on your machine, not in CI.

## For developers and contributors

Run `make onboarding` then `make dev`; the `Makefile` lists every other target. Architecture and conventions live in [AGENTS.md](AGENTS.md).
