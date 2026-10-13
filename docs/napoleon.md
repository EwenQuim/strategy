# Napoleon: the default local bot

Built on the signature rules of PR #114 and the merged #117/#118 follow-ups. Implementation:
`client/src/bots/strategies/napoleon.ts`, registered through `BOTS` and implementing `Bot<Options>`.

## Decision model

1. Enumerate complete activations: move, one signature, reposition, end turn.
2. Keep quiet endpoints and a separate quota of up to 160 signature outcomes. Movement cannot consume the signature quota. Army position, material, resources and support order signature candidates.
3. Shortlist the strongest root candidates using the existing initiative-aware tactical evaluator.
4. Iteratively search adversarial replies. Only a fully completed iteration replaces the previous result; an exhausted budget does not compare one deeply searched root against another shallow root.
5. For at most three nearly tied tactical candidates, simulate the remaining initiative cycle until the acting unit returns. A cheap army-level policy drives these forecasts. Their bounded bonus is at most one point, so a speculative forecast cannot replace a clearly stronger tactical result.

The tactical evaluator remains the trusted foundation. Army evaluation is an additional ordering/forecast tool, not a replacement for king safety. An initial rollout-only version lost 11 of 12 benchmark games and was rejected.

Search is deterministic. Caches belong to a decision. Future Hellfire analysis uses a synthetic random stream, never the battle's actual stream. The engine remains the judge of all proposed actions.

## Options and presets

| Preset | Root candidates | Reply setting | Aggression | Caution |
| --- | ---: | ---: | ---: | ---: |
| Easy | 3 | 1 | 1.2 | 0.35 |
| Normal (default) | 6 | 1 | 1 | 0.8 |
| Hard | 8 | 2 | 1 | 1 |
| Brutal | 12 | 3 | 1.2 | 1 |

`replies` controls the beam (at least three, otherwise twice this setting), the maximum searched reply horizon (setting + 1), and the work budget (1,200 new tactical evaluations per setting). Budget exhaustion can stop an iteration before the requested maximum. Forecasts still span the initiative cycle when tactical candidates are close; this is selective analysis, not exhaustive full-round search.

## Campaign strategy contract

Every level authors the same configuration used by custom play, URLs and battle snapshots:

```json
{
  "bot": {
    "name": "napoleon",
    "options": { "candidates": 12, "replies": 3, "aggression": 2, "caution": 1 }
  },
  "setup": { "biome": "volcano", "map": ["..."], "player": [], "enemy": [] }
}
```

The abbreviated setup above only illustrates field placement. Real authored setups must satisfy normal map/army validation.

`client/src/campaign.ts` resolves configurations through the catalog and rejects unknown bots or invalid options. Strategy does not live in `FixedBattleSetup`; `enemyStance`, campaign depth overrides and level difficulty dispatch are removed. New campaign-specific strategies can implement `Bot`, register once in `BOTS`, and be selected by any level. Their internal phases remain their own concern.

Authored campaign bot configurations live in the campaign packs; their options and presets are defined by the strategy implementation. The catalog accepts the former `commander` ID when parsing old URLs, and saved battles retain their identity across the rename.

## Evidence and acceptance

- The Napoleon benchmark target in the Makefile runs symmetric 5v5 seeds on both sides against legacy depth-four Hard. Latest run on the merged baseline: **6 wins, 5 losses, 1 unfinished**. This is a small regression benchmark, not evidence of overwhelming general superiority.
- Latest native run after #118: p95 **361 ms**, worst **810 ms**. At 6× browser CPU throttling, the earlier measured Brutal sample had a worst main-thread bot task of **508 ms**, with **zero idle paints**. A deterministic evaluation budget is not a wall-clock guarantee.
- `make record-campaign ARGS="--write"`: freshly solved all **78** levels against their authored bots. Re-recording updates only solved entries and includes the bot configuration in fixture identity.
- Brutal: five recorded victories finish with a **1-HP king** (levels 1, 2, 5, 14, 19); level 4 required the Napoleon assault player policy instead of the existing scripted search player. No maps or armies were weakened.
- Integration replays recorded human decisions against **fresh live bots**, in addition to replaying engine commands. Historical enemy commands alone cannot establish that a level remains beatable.

The requested “Brutal feels hard to win” is a playtest acceptance criterion. Tight victories and benchmark results are useful proxies, not a substitute for human play. Check focus fire, king pressure, useful repositioning and whether repeated retreat can force a stalemate. One benchmark remained unfinished; anti-stall strength is a follow-up target.

## Reproduction

```sh
make bench-napoleon
make record-campaign ARGS="brutal 14 --write"
make lint
make check
make test-integration
THROTTLE=6 DIFFICULTY=brutal TURNS=3 make bench-web
```

Fresh enemy signatures, reload persistence, shared bot identity, portrait controls and reduced motion are covered by the existing browser suite. Campaign replay hashes bind authored input/configuration; bot behavior tests assert outcomes rather than opaque decision hashes.
