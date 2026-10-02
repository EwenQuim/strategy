# Achievement Unlocks — Design Ideas

Hexmate's achievements (`client/src/lib/achievements.ts`) are currently badges only.
This document proposes what earning them could unlock.

## Design constraints (from AGENTS.md and the architecture)

- **No gameplay advantages.** Unlocks may be cosmetic, or new *content to play*
  (levels, AI opponents) — never stronger units, extra roster slots, or easier maps.
- **One fixed viewport, mobile-first.** Unlocks must surface in compact UI: settings
  toggles, the campaign list, the online waiting room — not new dense screens.
- Everything is registry-based, so most ideas below are cheap:
  - biomes carry a `theme` (CSS variables) applied as inline styles
  - AI strategies register in `STRATEGIES` (`ai/decision.ts`)
  - campaign packs are validated JSON files (`lib/campaigns/*.json`)
  - pawn icons are per-class assets
- Unlocks would live in `localStorage` alongside `achievementProgress.ts`
  (`hexmate.achievements`), derived from the earned list rather than duplicated.

---

## Tier A — Recommended first slice

### 1. Bonus challenge levels ("Gauntlet")

Each achievement unlocks a bespoke, authored one-screen challenge level themed on
*how* you earned it — a separate campaign pack, e.g. `008-gauntlet.json`:

| Achievement | Challenge level it unlocks |
|---|---|
| `speedrun` | "Blitzkrieg": win in 3 rounds against a full hard bot |
| `cleanHands` | "Pacifist": win killing only the King, on a crowded map |
| `partyOfOne` | "Last Stand": King alone vs. 6 units |
| `thread` | "One HP": your King starts at 1 HP |
| `dogs` | "The Pack": all-Wolf army |
| `rageQuit` | "Red Mist": win with a 1-HP Berserker's kill |
| `ninjaRegicide` | "Shadow of the King": assassinate a guarded King |

This is the strongest idea because:

- The whole level pipeline already exists (`FixedBattleSetup` + `validateSetup` +
  the campaign briefings machinery). A new pack is one JSON file.
- Challenge levels are *harder*, not easier — consistent with the "tense, bold
  play" design goal and with the no-advantage rule.
- It gives each achievement a replayable payoff instead of a one-time badge.
- Integration tests already require a reproducible player victory per level, so
  the pack ships verified.

### 2. Board themes (cosmetic skins)

Biomes already ship theme CSS variables and the game screen applies them inline.
The cheapest real cosmetic system: a "Board theme" picker (settings or custom
battle screen) where achievements unlock palettes:

- `floorIsLava` → volcano palette variants / "Magma" skin
- `untouchable` → translucent "Phantom" tiles
- `towerCamper` → watchtower-gold accent skin
- `chainReaction` → ember/spark border highlights

Note: currently themes come *from the biome of the setup*. A skin system would
either add new biome entries (registered in `BIOMES`, recruitable nowhere) or a
palette-override layer. The first option reuses the most machinery.

### 3. Unlockable AI strategies (opponents, not advantages)

The AI registry is the one place a new "content" unlock is nearly free. Earning
achievements could unlock *harder* bot archetypes for custom battles, e.g.:

- `reaper` → "Reaper" bot: trades aggressively, hunts wounded units
- `nobodyLeftBehind` → "Tactician" bot: retreats and protects its King
- `dogs` → "Swarm" bot: floods cheap fast units

This is not a gameplay advantage — the player gains nothing; they gain *new
opponents*. It directly answers "the game gets stale": the `STRATEGIES` registry
exists precisely to make this pluggable.

### 4. King & pawn cosmetic variants

Pawn classes already carry an icon path; variants are alternate icons/accents
selectable per profile:

- `doneRight` → gold "Conqueror" crown for your King
- `thread` → cracked-but-standing crown
- `glassCannon` → masked Ninja variant
- `rageQuit` → war-paint Berserker
- `untouchable` → ghostly King

Since pawns are shared SVG/emoji assets, this is mostly an art + selector task.
Beware online mode: variants must stay player-side (the viewer renders their own
units differently), which the client-side rendering already permits.

---

## Tier B — Outside the box

5. **Victory epilogues.** `GameResult` writes a short story sentence assembled
   from *how* you won: earn `ninjaRegicide` and the result screen says "The King
   never saw the shadow coming." Achievements become the game's narrator.
   Cheap (pure i18n work), very on-theme for a game with authored campaigns.

6. **Battle-log stamps.** The log already exists; earned achievements unlock
   emoji/flair stamps you can leave on your own moves in local replays.

7. **Online waiting-room flair.** The waiting room shows your name; earned
   achievements could show a small badge row or a chosen title ("Reaper",
   "Kingslayer"). Caution: unlocks are per-device `localStorage` with no
   account system, so opponent-visible flair would need server-side persistence
   in `server/` — a bigger step. Self-visible flair is free.

8. **Custom-battle presets.** Unlock authored army/map presets in the custom
   battle screen ("Wolfpack ambush", "Twin towers") — content, not power, since
   both sides are visible before the match.

9. **Board-visual weather effects.** Cosmetic-only weather overlays
   (embers for `chainReaction`, snow for an ice achievement later). Pure
   `BattlefieldEffects.tsx` work, no engine change.

10. **Hall of fame snapshots.** The result screen already computes fresh
    achievements; engrave them into a small local "war chronicle" (list of
    victories + badges earned), viewable from the home screen.

---

## What *not* to unlock

- **Unit stats, extra recruits, rerolls, easier maps** — violates the
  "never gameplay advantages" rule and would make achievements mandatory.
- **Existing campaigns** — they're already gated by `requiredVictories`;
  double-gating by achievements would frustrate players and couple two
  progression systems.
- **Anything paid or online-visible** before there's a server-side profile.

## Suggested rollout

1. Challenge-level pack (idea 1) — highest replay value, reuses everything.
2. Board themes (idea 2) — first "cosmetic" system, settings toggle.
3. One AI strategy (idea 3) as a proof of archetype unlocks.
4. Pawn variants (idea 4) once there's art budget.
