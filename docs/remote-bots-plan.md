# Mistral / Jev: deferred improvement plan

Goal: let remote models select strategic plans using accurate engine facts. This work is separate from Napoleon and requires no provider changes in the local-bot implementation.

## 1. Make the position description accurate

- Include initiative order and the next activation of each unit.
- Include energy, signature-used state, protection target/duration, temporary buffs and healing timing.
- Describe the exact playable map, including absent tiles. Do not imply unlisted coordinates are plains.
- Describe Hellfire centers, radius, damage and round-end timing.
- Phrase the goal relative to the active side, rather than hard-coding ENEMY ownership.

## 2. Choose whole activations

Generate legal move → signature → reposition plans locally. Offer a diverse shortlist with stable option identifiers. Models choose one complete plan; the reducer validates and executes it normally.

Provide concrete consequences: damage and kills, friendly fire, king threats, enemies that act before escape, follow-up attacks, resource pickup and final position. Avoid asking the model to reconstruct hex paths and energy arithmetic from coordinates.

## 3. Improve the objective

Prioritize victory and preventing forced king loss, productive trades, focus fire and pressure with an exit. Remove instructions equating all unused energy with wasted play. Keeping a good firing position can be correct.

For Jev, each criterion should describe these consequences, rather than predominantly distance to the player king. For Mistral, ask for a legal plan identifier with a bounded completion format; compare model/effort settings only after correcting the decision representation.

## 4. Measure separately from fallback

Track provider success, invalid replies, timeout/truncation, fallback rate, latency and cost. Evaluate actual remote decisions separately from local fallback games. Compare on the same tactical-position set and mirrored matches used for local bots.

Do not feed only Napoleon's scalar score: offer engine-derived facts and competing plans so models can contribute reasoning instead of copying the local evaluator's biases.
