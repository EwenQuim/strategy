# AI plan

Goal: an AI that reads the board accurately at every difficulty, whose behaviour comes from small per-unit and per-side pieces instead of `kind === 'king'` checks, and whose difficulty comes from risks it chooses on purpose. It must never look like it blundered.

## Principles

1. **Same information at every difficulty.** Every level sees the whole board, the exact escape odds and the same move options, and searches deep enough to chain "move then attack" (depth 2 minimum). Difficulty is not blindness.
2. **Difficulty is temperament.** An easier AI knowingly accepts worse trades: it overextends, charges into danger for damage, chases the nearest or most tempting target, and coordinates less. Each choice has a visible reason ("it went for the archer"), so a player can read it and punish it.
3. **Guardrails, not blunders.** At every difficulty the AI never:
   - misses a winning move (enemy king kill available);
   - leaves its own king to a lethal threat when a safe option exists;
   - kills its own unit on lava or Hellfire, or hits its own units with an area special, for no gain;
   - throws away a unit for zero damage when an equally good safe option exists;
   - ends a turn doing nothing while a free, safe attack is available.
4. **Units own their behaviour.** A unit file describes what the unit can do (`special`) and what it wants (`ai`). The search and the scoring are generic.
5. **Every step is measured.** Refactors must leave simulations identical. Behaviour changes are judged by simulated win rates and the campaign integration tests.

## Target architecture

Engine subfolders may only import their own folder or top-level engine files, so the AI modules live at the engine root:

```
engine/
  ai.ts             public entry: difficulty presets and chooseTacticalActions
  ai-search.ts      candidate generation, beam search, expected escape outcomes, time budget
  ai-evaluate.ts    sums unit terms and side terms, no unit-kind checks
  ai-plan.ts        side plan computed once per round: stance, force ratio, focus target, stalemate counter
  ai-guardrails.ts  vetoes applied to the ranked options before a pick
  pawn-ai.ts        PawnAi hooks and the default unit behaviour
  pawns/<unit>.ts   special (what it can do) + ai (what it wants)
```

Per-unit hooks, with defaults on `Pawn` so most units override one or two:

```ts
interface PawnAi {
  moves(pawn, state): Action[][]        // options to consider (king: every reachable hex)
  value(pawn): number                   // worth of the unit
  risk(pawn, incoming, plan): number    // how much it fears expected incoming damage
  goal(pawn, state, plan): number       // where it wants to stand
}
```

Profile (replaces `BotOptions`):

```ts
type AiProfile = {
  search: { depth: 2 | 3; beamWidth: number; timeBudgetMs: number }
  temperament: {
    riskAppetite: number   // 0 calibrated, higher accepts worse trades for damage
    aggression: number     // weight of approaching and pressuring
    focus: 'best' | 'nearest' | 'weakest' | 'backline'
    coordination: number   // 0 each unit alone, 1 follows the side plan
    latitude: number       // score margin within which a non-best option may be picked
  }
  stance?: 'hold' | 'balanced' | 'assault'
}
```

A level can override it in its JSON: `"ai": { "preset": "normal", "stance": "assault" }`.

## Steps (one PR each)

### 1. Per-unit AI hooks, no behaviour change

- Add `ai` to `Pawn` with defaults reproducing today's generic scoring.
- Move the king special cases (`ai.ts:35`, `:161`, `:168`, `:180`) into `King.ai`, and the bulwark and king rules of the rule bot into their units.
- Split `ai.ts` into `ai-search.ts`, `ai-evaluate.ts` and `pawn-ai.ts`.
- **Done when** the 126-decision fingerprint in `bot-sweep.test.ts` and every campaign simulation are unchanged.

### 2. Free speed-ups, no behaviour change

- Shortcut units with no enemy reachable this turn: step toward the nearest attack hex without a search.
- Cache each opposing unit's reachable hexes per decision; recompute only for units whose paths the acting unit touches.
- Quiet simulation for analysis: no battle log strings, and copy the map only when a rune is picked up.
- Run the AI in a Web Worker so the UI never freezes, and add a time budget per decision.
- Add `npm run bench:ai` (the timing script used so far) with the big story levels and Brutal 19 and 20.
- **Done when** decisions are identical and the worst reply on The Long Night is under 50 ms.

### 3. Difficulty from temperament, with guardrails

- Every preset searches at depth 2 or 3. Easy stops being depth 1.
- Introduce `AiProfile.temperament` and move `caution` into `riskAppetite`.
- Pick among options within `latitude` of the best score, preferring the one that fits the temperament (more damage for a reckless AI, the preferred target for its focus), never a random one.
- Implement `ai-guardrails.ts` as vetoes on the ranked options, shared by all profiles.
- Add a blunder test suite: one small board per guardrail, asserted at every difficulty (extends the existing "take a winning attack" tests in `ai.test.ts`).
- Retune easy, normal and hard so the Original, Brutal and Shattered Crown integration tests still pass.
- **Done when** the guardrail suite passes at every difficulty and simulated win rates rise from hard to easy without any guardrail firing in normal play logs.

### 4. Side plan, stances and the stalemate breaker

- `ai-plan.ts` computes once per round: force ratio, stance, focus target, rounds since the last damage dealt.
- Aggression rises with the stalemate counter, so a waiting AI eventually commits.
- Caution scales with the force ratio: a 12 v 3 horde accepts losses.
- `cohesion` term: units prefer to advance next to allies, so a group moves as a wave instead of one unit at a time.
- Per-level `"ai"` override in campaign JSON. Three Against the Horde gets `assault`.
- **Done when** in Three Against the Horde the horde enters the canyon as a column within a few rounds, and holding the line still wins.

### 5. Unit goals

One unit per commit, each checked by simulation:

| Unit | Goal |
|---|---|
| King | Commander: 1 to 2 hexes behind the front, next to injured allies so rally is deliberate. Warrior when clearly ahead or in the endgame. Risk grows sharply only near lethal damage. |
| Bulwark | Stay next to the ally it protects, or hold a chokepoint. |
| Archer | Keep 2 to 3 hexes from targets and avoid melee contact. |
| Magician | Prefer hexes that line up several enemies. |
| Bomber | Avoid clusters of its own side, aim at enemy clusters. |
| Ninja | Hunt the back line (archers, magicians, king); never end a turn exposed at 1 HP. |
| Swordsman | Default: close in and charge. |

### 6. Realistic danger

- Each opposing unit can hit only one target next turn: assign its threat to its most likely target instead of counting it against every unit at once.
- Keep the guard (bulwark protect) redirection.
- **Done when** crowds stop freezing out of range in simulations, and the campaign integration tests pass.

### 7. Rebalance

- Re-run every campaign and story level simulation with the final AI and retune rosters where a level fell outside its target (winnable, but not at every caution).
- Revisit Bridge of Shadow and Three Against the Horde.

## Verification tools

- **Fingerprint:** `bot-sweep.test.ts` hashes 126 decisions. It must stay unchanged for steps 1 and 2 and is updated deliberately afterwards.
- **Simulations:** deterministic games of the scripted player against each level at several cautions, plus a hold-the-line player for defensive levels. Results are compared before and after each step.
- **Benchmark:** worst and average AI reply time on the largest levels.
- **Guardrail suite:** small hand-built boards, one per rule, at every difficulty.
