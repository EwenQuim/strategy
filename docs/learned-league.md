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
are distinct. Measured checkpoint and final results will be added here once complete.
