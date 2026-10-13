# Resumable learned-bot training

The local league workflow separates expensive game generation from fitting and evaluation.
All commands use the current engine; old checkpoints are opponents, not old game outcomes.
No API, GPU or training is needed when playing the resulting bot.

```sh
make value-league ARGS="collect --config=scripts/value-league.example.json --output=training-runs/data-001 --minutes=45"
# Same settings and unchanged engine/bots; completed games are skipped.
make value-league ARGS="collect --config=scripts/value-league.example.json --output=training-runs/data-001 --minutes=45 --resume"
make value-league ARGS="fit --config=scripts/value-league.example.json --dataset=training-runs/data-001 --initial=src/bots/value-model.json --output=training-runs/fit-001"
make value-league ARGS="evaluate --config=scripts/value-league.example.json --candidate=training-runs/fit-001/candidate.json --output=training-runs/selection-001 --minutes=20"
```

Paths are relative to `client/`. Existing scalar overrides also work, e.g.
`--training.regularization=0.003`, `--evaluation.pairs=16`, and
`--evaluation.search.simulations=128`. Opponents and scenario arrays belong in JSON config.

## Repeated generations

Pass `--challenger=<candidate.json>` to `collect` to add a candidate to the configured league.
Pass comma-separated dataset directories to `fit` to retain earlier experience. Use fresh
training prefixes for each generation. `evaluate --reference=<checkpoint.json>` compares
against a frozen checkpoint instead of the configured incumbent model.

`fit --blend=0.25` archives a conservative blend (25% fitted weights, 75% initialization),
with validation loss recomputed for the persisted weights. `evaluate --referenceOptions='<JSON>'`
keeps the reference search fixed when screening candidate search options.
`fit --excludeRandom=true --lastFraction=0.5` trains on the latter half of completed
non-Random games. Filtering is explicit in the fit manifest; it never relabels timeouts.

For direct playing-strength optimization, `make value-optimize` evolves weight populations
against a frozen reference using the same search budget and common seeds within a generation:

```sh
make value-optimize ARGS="--config=scripts/value-league.example.json --initial=src/bots/value-model.json --output=training-runs/evolution-001 --population=8 --generations=3 --sigma=0.3 --minutes=45"
```

Every mutation, tournament and generation winner is saved. `--resume` reuses completed matches.
The fitness is wins minus losses per game; censored games get neither a win nor a loss, and
their rate remains visible. Evolution results still require fresh held-out evaluation, including
completion and latency gates; selection fitness alone does not promote a released checkpoint.

`make value-compose` creates a separately archived candidate by transferring named features
between two checkpoints. `make value-evidence` exports compact publishable run evidence:

```sh
make value-compose ARGS="--base=src/bots/value-model.json --source=training-runs/fit-001/candidate.json --features=energy,units:wolf,units:lancer --blend=0.5 --output=training-runs/transfer-001.json"
make value-evidence ARGS="--runs=training-runs/fit-001,training-runs/selection-001 --output=training-runs/evidence-001.json"
```

## Evidence and interruption handling

- Collection writes each completed game atomically, including censored outcomes.
- Evaluation writes every match atomically and refreshes its report as results arrive.
- `--resume` rejects changed configurations, checkpoint weights, rules or bot implementations.
- A deadline stops before starting the next game; the current game is allowed to finish.
- Whole paired seeds share a validation split, assigned by a stable hash independent of
  opponent scheduling. At most 80 evenly spaced positions per completed game are retained.
- Timeouts are excluded from fitting and receive zero evaluation score credit. Genuine
  terminal draws receive half a point.
- Reports retain both bots' decision times and approximate pair-level 95% intervals. Small
  screening samples are not release evidence; freeze a finalist and use fresh final seeds.

The original `make retrain-value` single-run command remains available. The league example
adds incumbent Learned, stronger opposition, all five biomes and every unit type. Final
latency measurement should run without concurrent training load and be checked in a browser.

## Three-hour gameplay-update experiment

Started from engine revision `8866d03`: area King healing, adjacent Wolf energy support and
direct/adjacent Lancer Rush. The immutable reference is `league-v1`. Candidate comparisons
start with identical 128-simulation, 16-candidate, horizon-16 search; no longer thinking time
is purchased to claim a training improvement. Training, selection and final seed identities
are distinct.

### Results

500 first-generation games and 143 second-generation games were saved. The second generation
included a screened evolved challenger. Models were fitted from fresh completed games only;
several regularization strengths, conservative blends, direct weight evolution and explicit
combat-position filtering were tried. The combat fit used 378 completed non-Random games,
16,848 sampled positions; held-out log loss improved from **0.2598 to 0.1865**.

| Candidate / evaluation | Wins | Losses | Timeouts | Games |
| --- | ---: | ---: | ---: | ---: |
| Larger-data fit, selection vs old Learned | 20 | 14 | 16 | 50 |
| Evolved weights, selection vs old Learned | 24 | 13 | 13 | 50 |
| Evolved weights, untouched final vs old Learned | 20 | 17 | 27 | 64 |
| Combat fit, selection vs old Learned | 24 | 10 | 16 | 50 |
| Combat fit, fresh confirmation vs old Learned | 23 | 21 | 20 | 64 |
| Combat fit, fresh Commander Brutal | 21 | 7 | 2 | 30 |
| Combat fit, fresh depth-four beam-6 search | 18 | 8 | 4 | 30 |
| Old Learned, same Commander Brutal scenarios | 18 | 10 | 2 | 30 |
| Old Learned, same depth-four search scenarios | 16 | 11 | 3 | 30 |
| Combat fit, same old maximum search budget (partial) | 6 | 3 | 5 | 14 |

**These results do not establish a generally stronger replacement for `league-v1`.**
Frozen head-to-head leads did not survive with a meaningful margin, and the timeout rates
failed the intended completion gate. Normal difficulty, model identity and existing presets
therefore retain the incumbent. The evolved final p95 was 93.2 ms versus 91.4 ms; combat-fit
confirmation p95 was 99.5 ms versus 107.7 ms. They spend the same search budget, but timing
alone does not justify promotion. Concurrent-run timings are provisional; no mobile-speed
claim is made.

The maximum-budget run stopped at its 25-minute boundary after 14/20 requested games. Both
bots used 2,048 simulations, 32 candidates and horizon 32. P95 was approximately 2.26 s on
both sides; the partial 6–3–5 result cannot establish a higher maximum difficulty. Its
completion flag remains false in the evidence archive.

The larger-data fit was a snapshot while collection was still running (434 recorded games,
372 completed); the combat fit used both completed generation directories. This distinction
is retained in the fit manifests rather than retrospectively claiming every fit used all 643 games.

The compact [evidence archive](learned-league-evidence.json) preserves manifests, candidate
weights, dataset summaries, exact scenario outcomes and artifact digests. Full position data
and every intermediate mutation remain in ignored `client/training-runs/`. Re-run the saved
configuration with the reference weights to establish fresh comparisons after another rule
change; do not reuse old outcome labels.

The next strength work should target missing tactical/initiative information, useful support
energy versus already-exhausted recipients, and stalling decisions. More epochs on the same
linear feature set or larger simulation budgets did not solve those limitations in this run.

The combat fit improves scores against the two handwritten opponents on these identical
scenario sets (70% vs 60% against Commander; 60% vs 53.3% against depthsearch). Samples remain
small, and neither this comparison nor the direct head-to-head validates a general strength
upgrade. Candidate weights are retained in the evidence archive for follow-up experiments.

Verification: `make check` passed 203 unit tests, lint, formatting, typecheck and build;
`make test-integration` passed all 15 tests. Collection and optimizer resume smoke checks
passed, as did the client/Go push checks and the browser CI job.
