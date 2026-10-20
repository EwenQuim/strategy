# Gameplay experiments

Use `bench-gameplay` in the root Makefile. Its arguments are passed through `ARGS`.

Save a control run with `--output=<control.json>`, then replay it on a rule-change branch with `--baseline=<control.json> --output=<candidate.json>`. Add `--jobs=<workers>` to parallelize independent matches. `--json` prints the complete artifact; normal output shows the population and paired deltas.

Saving JSON also creates a sibling self-contained HTML dashboard. Open it directly in a browser for biome, army and bot-matchup engagement charts, unit contribution/support charts, and paired impact plots with uncertainty intervals. Use `--html=<path>` to choose another destination or generate HTML without saving JSON. Reports need no server or external chart library and can be attached as PR artifacts.

The defaults live in `DEFAULT_EXPERIMENT` in `gameplay-experiment.ts`: strong search policies with Hannibal providing a cautious opponent, not an artificial avoidance bot. Override them using `--config=<json>` with that exported configuration shape, or use `--seeds=<count>`, positional seed names, `--biomes=<comma-separated names>`, `--bots=<comma-separated labels>`, and `--max-rounds=<limit>`. Bot entries use existing bot catalog configurations. Roster entries have a name and a units array. Optional `setups` entries have a name and an engine `FixedBattleSetup` for authored bottlenecks or specific tactical positions. All games are normal matches; stalling is measured in those matches, not a separate population.

## Exploration and confirmation

Configuration contains disjoint `seeds` and `confirmationSeeds`. The default `--phase=exploration` uses only the first set while developing ideas. Once a finalist's rules and stats are frozen, generate a separate control on the unchanged rules with `--phase=confirmation --output=<confirmation-control.json>`, then replay that control on the finalist branch. Baseline replay inherits its phase. Comparing different phases or overlapping configured seed sets is rejected, and reports record the phase without pooling results. Seed overrides apply only to the selected phase.

Confirmation is not a tuning loop. If its results lead to changes, choose fresh confirmation seeds for the next run. The harness enforces separation within a configuration but cannot stop people inspecting or reusing a published seed set. Defaults are reproducible, not secret. Keep the bot and scenario configuration fixed between exploration and confirmation to test generalization to new maps rather than a different experiment.

Generated scenarios rotate opponent rosters across seeds. Both bot orientations and self-play are included. Maps vary by seed and biome using the engine's map generator. Every report saves starting tiles, pawn positions, initiative, and random state. Comparisons replay those exact starts rather than regenerating them under changed rules.

For a new unit, use `--baseline=<control.json> --substitute=<old-kind>:<new-kind>:player`. This replaces one unit on that side, at its original position and initiative, with the new unit's maximum health. Run the enemy-side substitution separately. All chosen starting armies must contain the replaced unit. The saved scenario remains the control scenario; the report records the substitution separately. This is a controlled roster replacement, not an estimate of strength independent of what it replaced.

## Reading results

- Engagement: unfinished and no-contact rates, capped first-contact timing, stall rounds, combat rounds, retreat and idle activation rates. Terrain/self damage is not combat contact. Unfinished contact timing is censored at the round limit, not an observed contact.
- Contribution: per-unit damage, kills, survival, healing, granted energy, protection use and intercepted damage. Raw round and per-unit telemetry are saved for each match.
- Collaboration: same-round attacks by different allies on the same enemy, plus damage by allies within a round after a displacement. These are observed sequences, not proof of causal synergy. Compare complementary rosters or controlled substitutions to investigate that.
- Avoidance: nearby enemy moves increasing distance and attacks declined despite an opening attack opportunity. Neither establishes motive; interpret together with the paired engagement changes.
- Tension: value-model lead changes, swings and lead-settling timing are heuristic proxies. A permanently tiny lead is not an inevitable victory. They cannot establish fun, and the report does not combine them into a fun score.

Paired comparisons show deltas and approximate normal intervals clustered by seed, with biome/army and bot-matchup breakdowns. Few seeds are exploratory. Context subdivisions can have much less evidence than the overall run, and screening many ideas creates multiple-comparison risk. Use the confirmation phase for finalists and human playtests before deciding a mechanic is fun. A bot's failure to exploit a mechanic is not proof that humans cannot exploit it. Stronger bots cost more time: parallelize matches or reduce exploration seeds instead of silently weakening the benchmark population.

Reports record commit, tracked patch hash, bot-source fingerprint and value models. Comparison rejects changed configuration or bot implementations. Model feature contracts may need a zero-weight extension when adding a unit; keep established weights unchanged and disclose it in the trial PR. Commit experiment code before collecting final artifacts so provenance includes it.
