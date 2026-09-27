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
  ai-choice.ts      temperament pick among near-best options, with structural guardrails
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

Profile (`BotOptions`), grown step by step:

```ts
type BotOptions = {
  depth: 2 | 3
  beamWidth: number
  riskAppetite: number                    // step 3: 0 calibrated, 1 ignores threats to its units
  focus: 'best' | 'nearest' | 'weakest'   // step 3
  latitude: number                        // step 3: margin within which a more tempting option wins
}
```

A fixed battle setup can give the enemy orders: `"enemyStance": "assault"`.

## Steps (one PR each)

### 1. Per-unit AI hooks, no behaviour change

- Add `ai` to `Pawn` with defaults reproducing today's generic scoring.
- Move the king special cases (`ai.ts:35`, `:161`, `:168`, `:180`) into `King.ai`, and the bulwark and king rules of the rule bot into their units.
- Split `ai.ts` into `ai-search.ts`, `ai-evaluate.ts` and `pawn-ai.ts`.
- **Done when** the 126-decision fingerprint in `bot-sweep.test.ts` and every campaign simulation are unchanged.

### 2. Free speed-ups, no behaviour change

- Cache each opposing unit's reach per decision, keyed only by the units and runes within its walking or jumping range, so it survives the acting unit moving elsewhere.
- Cache the best damage that reach can deal to each target position, and compute per-hex move costs once per unit instead of once per target.
- Add `npm run bench:ai` with the big story levels and Brutal 19 and 20.
- **Done when** decisions are identical and the worst reply on The Long Night is under 50 ms.
- Deferred: a Web Worker (the AI runs inside a synchronous reducer and game states hold class instances, so it needs an async game loop and unit rehydration; not worth it at under 50 ms) and a quiet simulation mode (not needed for the target). Skipping the search for idle units moves to step 3 because it can change decisions.

### 3. Difficulty from temperament, with guardrails

- Every preset searches at depth 2 or 3. Easy stops being depth 1.
- `caution` becomes `riskAppetite` (caution = 1 - riskAppetite).
- `ai-choice.ts` picks among options within `latitude` of the best value, preferring damage to the `focus` target, then more damage overall. Never random, and ties keep the best option.
- Guardrails are structural rather than vetoes: a deviation must deal more damage than the best option (never idle, never a pointless sacrifice), and latitude (at most 100) stays far below the victory and lethal king scores. A veto layer was tried and never fired, so it was dropped.
- Guardrail tests at every difficulty: lava suicide, bombing own units, skipping a free kill, next to the existing lethal-king, defender and winning-attack tests.
- Presets: easy (risk 0.9, nearest, latitude 60), normal (risk 0.5, weakest, latitude 25), hard (risk 0, best, latitude 0). Scripted player wins over all 67 levels at two cautions: 75% / 66% / 60%. Temperament changes 2 to 3.5% of easy and normal decisions.
- Skipping the search for idle units is dropped: step 2 already met the speed target.

### 4. Side plan, stances and the stalemate breaker

- `ai-plan.ts` computes the side's intent per decision: caution and aggression.
- **Stalemate breaker:** `GameState.lastClashRound` records the last round an action hurt anyone. After two quiet rounds, aggression grows by 25% per round.
- **Horde caution:** a side the battle setup made at least twice as numerous divides its caution by that ratio. It uses the designed armies, not the live count: a live ratio made even battles turn reckless once they tilted (Iron Caravan, Basalt Court).
- **Stances:** fixed setups take an optional `enemyStance` (`hold`, `balanced`, `assault`) scaling aggression by 0.5, 1 or 2. Three Against the Horde uses `assault`.
- **Routing through allies** replaced the planned cohesion term. The real cause of units trickling in one by one was the approach map treating allies as walls: in a one-hex canyon the first attacker blocked the route for everyone behind it, so waiting looked as good as advancing. Only enemies block the route now; actual moves still respect occupied hexes.
- Normal is retuned to risk 0.65 to keep the difficulty order: scripted player wins 77% / 67% / 60% against easy / normal / hard.
- **Done:** in Three Against the Horde, 3 to 5 attackers are inside the canyon from round 2, and holding the canyon wins in 25 rounds (39 before).

### 5. Unit goals

One unit per commit, each checked by the campaign integration tests and simulated win rates. Unit goals now receive the enemy army as well as allies.

| Unit | Shipped |
|---|---|
| King | Graduated risk: 30 per incoming point while it keeps 2 health, 120 per point closer to death, lethal still forbidden. Commander: stays near allies, +3 per wounded adjacent ally so healing is worth more than keeping an ally wounded. Warrior when its side has twice the enemy soldiers or at most two enemy soldiers remain. |
| Archer | -10 per adjacent enemy: it cannot shoot at range 1. |
| Magician | +1 per extra enemy on its best fireball line. A tie-breaker only: 2 or more tipped Original's Last Crown out of reach of the scripted player. |
| Ninja | Caution floor of 0.7 whatever the temperament (1.0 tipped Last Crown), and +6 per adjacent ranged unit or king. |
| Bulwark | Dropped. Any bonus for holding a protection, even 1 point, made Iron Caravan's guard formation unbreakable in Original and Brutal. |
| Bomber, Swordsman | Default goal. Bombs already aim at enemy clusters through the special's candidates. |

Scripted player wins after step 5: easy 75%, normal 69%, hard 61%. Games are shorter because kings fight and rally.

### 6. Realistic danger (tried, dropped)

- Tried: each opposing unit threatens only its likeliest soldier victim, while vital units (the king) still count every threat.
- Result: hard rose from 61% to 51% scripted player wins, and Original's Powder Lesson and Brutal's Iron Caravan fell out of reach. Keeping half the threat on other soldiers still broke Powder Lesson.
- The shyness it targeted was the ally-blocked routing fixed in step 4, and games did not get shorter, so the conservative estimate stays.

### 7. Rebalance

- Every story level was re-simulated with the final AI. Target: winnable by the scripted player, but not at every caution.
- Three Against the Horde: 3 v 10 on assault broke the line by round 4 once the horde arrived as a wave; balanced stances paused the horde for rounds at a time. Now 3 v 9 on assault: 3 to 5 attackers in the canyon every round, holding the line wins 9 of 10 simulated games.
- Windy Hilltop swaps its sixth-ninja slot for an archer (it was won at every caution; a ninja made it lost at every caution).
- Broken Company, Green Fire Bay and The Frozen Wall lose one attacker each (lost at every caution).
- After the Rally and Hellfire safety fixes, Bridge of Shadow, Green Fire Bay and The Frozen Wall fell from one scripted win to none at cautions 0.25, 0.7, 1, 1.5 and 2. Removing Bridge's rear archer at (4, 0), Bay's swordsman at (3, 2) and Wall's swordsman at (1, 2) restores one, two and two wins respectively. Their maps, difficulties and special-unit roles stay unchanged, and integration tests pin their winnability.

### 8. Minimax over unit turns

The within-turn beam never simulated the opponent: replies were a static worst-case estimate. A human beat it easily, and win rates against a scripted player built from the same AI could not show it.

- **Turns, not actions.** `ai-turns.ts` enumerates a unit's whole turn: move or stay, special before attacks while energy lasts, then save energy or step back one hex after acting. Identical end positions are merged. On 1,846 real positions a turn has 21 variants at the median, 37 at p90, 125 at most.
- **Minimax with alpha-beta** (`ai-search.ts`): each ply is one unit's turn in initiative order; the searching side maximizes, the other minimizes the same score. Turns are ranked by their leaf score for move ordering and a beam, the last ply stops as soon as a turn is good enough for a cutoff, and turns with escape rolls average their hit and escape outcomes. A unit plays its chosen turn up to the first attack or special, then decides again.
- **Budget:** at most 1,500 scored positions per decision, a count rather than a clock so decisions stay deterministic.
- **Threat turn order:** an enemy only threatens a target if it acts before the target's next turn. Counting every enemy against every target flooded every searched line with a lethal-king penalty once minimax had advanced the enemy, so every move looked equally lost.
- **Engine:** maps without runes are shared between states instead of copied on every action.
- **Presets:** depth now counts unit turns: easy and normal 2, hard 3.

Measured against frozen opponents from before #63 (the scripted player and a king rusher):

| | Before minimax | After |
|---|---|---|
| Brutal, scripted opponent wins | 21 / 40 | 5 / 40 |
| Original, scripted opponent wins | 27 / 40 | 19 / 40 |
| Original, king rusher wins | 10 / 40 | 5 / 40 |

Rebalanced for the stronger AI: Powder Lesson gains a player swordsman (Original and Brutal), Brutal's scripted exemptions become High Pass, Powder Lesson and Dune Patrol, and five story levels are retuned (Three Against the Horde is now three versus eight).

## Verification tools

- **Fingerprint:** `bot-sweep.test.ts` hashes 126 decisions. It must stay unchanged for steps 1 and 2 and is updated deliberately afterwards.
- **Simulations:** deterministic games of the scripted player against each level at several cautions, plus a hold-the-line player for defensive levels. Results are compared before and after each step.
- **Benchmark:** worst and average AI reply time on the largest levels.
- **Guardrail suite:** small hand-built boards, one per rule, at every difficulty.
