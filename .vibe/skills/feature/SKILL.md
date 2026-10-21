---
name: feature
description: >-
  Drive one feature or bug fix end to end, from written intent to verified,
  independently reviewed diff. Load for any request that adds or changes behavior,
  content or docs beyond a trivial edit, even when this skill is not named. Covers
  the 80/20 challenge, fit exploration, implementation under the repo test policy,
  quality checks, run-it verification, an unbiased subagent review and a de-clutter
  pass. --proto ships a throwaway local preview; --auto never asks and makes the PR
  the review point.
---

# Feature

Chains existing skills into one loop; each stage names the skill it delegates to.
For subagent steps, use your client's equivalent (Agent/Task tool), or print the
prompt for the user to paste in a fresh session.

The repo's `AGENTS.md` wins over this skill wherever they conflict.

## Decisions

At every choice point, classify the decision:

| Class | When | Interactive | `--auto` |
|---|---|---|---|
| **Act and log** | Value lost is marginal (95/5), adding it later is cheap with no lock-in, and no external contract changes. E.g. trimming a speculative part of the request, behaviour-preserving refactors covered by tests, picking between equivalent designs, triaging low/med review findings. | Do it | Do it |
| **Act and flag** | Simplifying existing behaviour with no external contract; an acceptance criterion that cannot be verified locally. | Do it, top of the final report | Do it, top of the PR body |
| **Ask** | Public contract changes (APIs, payload keys, save format, user-visible behaviour, URL parameters), data migrations, irreversible or prod-write actions, rejecting a high-severity security finding, scope cuts closer to 80/20 than 95/5, or anything where one of the act-and-log conditions is unclear. | Ask | Take the conservative option (smallest change, existing behaviour kept) and flag it; if none is safe, stop **blocked** |

The repo's `AGENTS.md` may move decisions into **Ask**; it wins over this table.

Log every decision in the intent file's `Decisions:` list. When asking, batch all open questions in one message (ideally
after step 2) and keep working on whatever does not depend on the answers.

With `--auto`, stop **blocked** when quality
checks stay red after 3 fix attempts, review is not clean after 2 rounds, or a
high-severity security finding cannot be fixed.

`<base>` is the branch the work starts from and is reviewed against: the repo's
default branch (`main`), unless the work is stacked on another unmerged branch or
targets a release branch; then ask (in `--auto`, pick the closest merge-base and log it).

Pick the mode first:
- `--proto` given: run **Prototype mode** only. Refuse `--proto --auto`.
- A prototype from an earlier run exists and the user asks to make it real: this is a
  **promotion**, see the end of Prototype mode.
- Otherwise: run steps 1 to 7.

## 1. Intent

Write the intent file at `$(git rev-parse --git-path feature)/<slug>.md` (in the git
dir, so never committed):

```markdown
# <title>
Type: feature | bug
Problem: <who hurts, how, evidence>
Acceptance criteria:
- <observable, testable statement>
Non-goals:
- <what we deliberately do not do>
Risk: low | med | high   (high = auth, secrets, untrusted input, money, data migrations)
Decisions:
- <what, why, how to revert>
```

Before writing it, challenge the request:
- Is it needed now? Does an existing feature, config or workflow cover it? Does it
  make the game more fun and strategic, per the design goals in `AGENTS.md`?
- What is the smallest cut that delivers most of the value? Take it alone when it is
  act-and-log; ask when it is closer to 80/20. List what it leaves out as non-goals.

Infer everything you can; anything left goes through the Decisions rules.

**Issue tracking.** Skip it unless the repo's `AGENTS.md` defines a tracker and the
conventions to follow.

## 2. Fit

Explore before designing (delegate wide searches to a read-only subagent). Read the repo's `AGENTS.md`
and any standards it points to. Report:
- **Where it belongs**: the module/layer that owns this responsibility (engine, bots,
  UI, server), and the existing pattern the change should copy (e.g. a new pawn or
  biome file plus its registry entry).
- **Reuse**: helpers, types, components, engine pieces that already do part of it.
- **Refactor first?** If the change would otherwise be a bolt-on (a new `if` branch on a
  type/flag, a special case in a shared function, a dependency pointing the wrong
  way), propose the refactor that makes it a natural extension: extract an interface
  and invert the dependency, add a strategy/registry entry, move logic to its owner.
  Keep the refactor behaviour-preserving and in its own commit.
- **Plan**: files to touch, tests to add (within the repo's test policy), how you will
  run it in step 5.

Use `system-design` only when this introduces a new system or service.

## 3. Implement

- **Bug**: write a test that reproduces the bug, run it, and confirm it fails for the
  reported reason before touching the fix. Fix the root cause in the shared code path,
  not at one caller. If the repo's test policy forbids a new test for it, reproduce it
  by running the app in step 5 instead.
- **Feature**: freeze acceptance criteria with tests only where the repo's test policy
  in `AGENTS.md` allows (engine rule changes, or when tests were asked for); verify
  the rest by running in step 5.
- Refactor commit (if any) first, then the behaviour change.
- Anything outside the intent goes in the final report, not the diff.

## 4. Quality checks

Run the repo's quality targets from the `Makefile` (format, lint, typecheck, tests).
Fix until green.

## 5. Verify by running

Run the real thing (the `Makefile`'s dev target for the client, its Go targets for
the server) and exercise every acceptance criterion.
Report evidence per criterion: the command or URL and the observed result. If
something cannot be run locally, say exactly which criterion is unverified and why.

## 6. De-clutter

Building leaves mess behind. Spawn a **fresh** subagent with the intent path and
`<base>` only:

> Read the intent at `<path>`. De-clutter the lines added or changed by
> `git diff <base>...HEAD` plus uncommitted changes. Behaviour must not change and
> nothing outside those lines may be touched.
> - Code: remove dead or unreachable code, unused imports, parameters and helpers,
>   debug leftovers and commented-out code, checks for cases that cannot happen,
>   single-use indirection, and options for values that never change. Replace logic
>   that duplicates an existing helper with a call to it.
> - Prose (comments, docstrings, docs): delete what restates the code or a name,
>   describes what is not the case, narrates history ("now uses X"), or repeats
>   something said elsewhere. Keep the non-obvious why, workarounds, and warnings
>   that prevent a real mistake. Shorten the rest.
> Edit in place. Return one line per edit: file:line, what was removed, why.

Check each edit in the main thread and restore anything that lost meaning, then
rerun step 4.

## 7. Unbiased review

Spawn a **fresh** subagent. Give it only the intent file path and the diff base,
never your plan, reasoning or conversation:

> Read the intent at `<path>`. Review `git diff <base>...HEAD` plus uncommitted
> changes against it. Run the `code-review` skill over `<base>` at run level
> `<Risk from intent>`. Then add:
> 1. Does the diff satisfy every acceptance criterion? Cite lines.
> 2. Anything in the diff not required by the intent (scope creep)?
> 3. Is there a simpler change that meets the same criteria?
> Return findings with file:line, severity and a concrete fix. Return none if clean.

If Risk is `high`, also run `vuln-scan` in diff mode in a separate subagent.

Triage every finding in the main thread: **fix** or **reject with a one-line reason**.
After fixes, rerun step 4, and step 7 once more if a
fix was non-trivial (max 2 review rounds).

## Final report

Write it, the PR body and commit messages under the step 6 prose rules.

- Flagged decisions first, then the blocked reason if any.
- Intent: one line, plus the scope cut taken.
- What changed: commits, and the refactor if any.
- Verification evidence from step 5.
- Review: findings fixed, findings rejected with reasons.
- Decisions: the full log.
- Out of scope: things noticed and deliberately left out.

Interactive: do not push or open a PR unless the user asks. `--auto`: push and open
the PR, as a draft when anything was flagged or blocked. Either way, follow the
repo's PR rules in `AGENTS.md`: smallest diff that delivers the behavior.

## Prototype mode (`--proto`)

For "show me quickly". The repo's prototype rules in `AGENTS.md` apply in full:
local edits only, no new tests, no commit, no push. Security basics (no secrets in
code, no prod writes) are not suspended either.

1. Write a three-line intent file (title, `Mode: proto`, what the user wants to see)
   at the step 1 intent path.
2. Implement the smallest thing that makes the idea visible. Hardcode, fake data and
   skip edge cases freely.
3. Run the `Makefile`'s format and lint targets.
4. Pick a free port (`python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1])"`),
   start the app in the background on it with the `Makefile`'s dev target, check it
   answers, and reply with the local link and the command to stop it.

Never push a prototype or open a PR from it.

**Promotion.** When the user asks to turn a prototype into the real thing, run steps
1 to 7 with the prototype as input, in a worktree on `feat/<slug>` (or `fix/<slug>`)
following the worktree rules:
- Step 1 turns the proto intent into a full one; what the user liked in the preview
  becomes acceptance criteria, the hacks become explicit non-goals or work.
- Step 2 reviews the prototype as a sketch, not as a base: keep what fits, plan the
  refactor or rewrite for what does not.
- Step 3 replaces every shortcut with real code, and the prototype commits (if any)
  are squashed or dropped so none reach the PR.
