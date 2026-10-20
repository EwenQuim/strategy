# Harpooner trial

This trial is stacked on the gameplay harness PR. Neither experimental unit is in random recruitment.

## Design

The broad experiment uses 180 unique generated boards across all five biomes, three rotating army templates, and twelve seed clusters. Each run contains 720 ordinary matches and 720 passive-probe matches. Ordinary policies are Napoleon easy and Random, including self-play and both orientations. Separate player-side and enemy-side substitutions replay identical control tiles, positions, initiative and random state.

Harpooner has 3 HP, a 2-energy signature and 1 damage at reach 1–2. It automatically pulls surviving distance-2 enemies to empty adjacent ground, preferring non-lava. Protection intercepts the hit and prevents pulling. Reachfighter has identical stats but no pull. Comparing against Swordsman measures the whole unit replacement; comparing against Reachfighter isolates the pull package, including its empty-landing requirement.

The final harness is from the `bench-gameplay` branch; trial implementation commits are `fe6c7fc` and `c0f6101`. The latter adds the no-pull control and appends another zero-weight model feature without changing established weights. The saved-control replay reproduced all outcomes and damage totals after telemetry corrections. Local raw artifacts are `harpoon-{control,player,enemy}-final.json` and `harpoon-reach-{player,enemy}.json` in the session's temporary directory. Use the Makefile benchmark target and the experiment guide to reproduce runs.

## Whole unit replacement versus Swordsman

| Ordinary games            | Player substitution | Enemy substitution |
| ------------------------- | ------------------: | -----------------: |
| Substituted-side win rate |     45.56% → 36.39% |    44.03% → 36.67% |
| Mean rounds               |         8.92 → 9.28 |        8.92 → 8.91 |
| Unfinished                |     10.14% → 11.11% |     10.14% → 9.72% |

The unit is weaker than Swordsman under these policies and rosters. This is not evidence that pulling itself is weak: Swordsman has different health, damage and mobility.

## Pull package versus same-stat no-pull control

| Ordinary games            |     Player substitution |      Enemy substitution |
| ------------------------- | ----------------------: | ----------------------: |
| Mean rounds delta         |                   +0.41 |                   −0.47 |
| Mean stalled rounds delta |                  +0.325 |                  −0.322 |
| Unfinished delta          | +1.81 percentage points | −1.11 percentage points |
| No-contact delta          |                       0 |                       0 |

The signs reverse by side. Combining both orientations, mean rounds change by −0.03 (approximate seed-clustered 95% interval −0.25 to +0.19), stalled rounds by +0.001 (−0.18 to +0.18), and unfinished rate by +0.35 percentage points (−0.95 to +1.64). There is no demonstrated overall engagement improvement.

Passive probes likewise show no meaningful stall-breaking effect: no-contact stays 15%, unfinished changes from 26.46% to 26.25%, and stalled rounds change by −0.024 (−0.054 to +0.007). Retreat ratio rises slightly, but that does not establish avoidance motive.

In ordinary games Harpooner averages 1.05 attacks, 0.55 pulls and 0.65 subsequent ally damage per appearance. That shows the mechanic sometimes enables a follow-up; it is not causal proof of collaboration or increased fun.

## Search-policy sensitivity

A smaller Depthsearch-normal/Hannibal-easy experiment covers 45 additional starts and 180 games per run, with three seed clusters. Against Swordsman, substituted-side win rate falls by 11.67 points on player and 12.78 points on enemy. Round/stall changes lean slightly downward, but intervals are wide. This check does not compare against the matched-stat control and cannot isolate the pull effect.

## Conclusion

This precise Harpooner is not supported as an anti-stalling improvement. Nor does the experiment prove that players avoid it at all costs. Local forced contact does not imply better global engagement. The side-sensitive result deserves investigation before tuning stats or generalizing the mechanic.

The harness is useful for screening concrete gameplay hypotheses and detecting contextual tradeoffs. These seeds were used for exploration, not held-out confirmation; the intervals are approximate and not corrected for multiple comparisons. Stronger/adversarial bots, targeted bottleneck scenarios and human playtests remain necessary before declaring a mechanic fun or generally balanced.
