# Color policy tooling

The scripts in `package.json` expose a baseline check, a full diagnostic report,
a strict check, and an explicit baseline refresh. Normal linting runs the baseline
check, including in CI. No command rewrites application colors.

CI also uploads the full inventory as a review artifact. The pre-push hook runs
the same baseline guard through lint; it does not print the full debt inventory.

The report prints file, line, column, rule and value. Findings are diagnostics,
not unique colors: a Tailwind literal can be reported by both the class rule and
the literal inventory rule.

## Policy

- Prefer semantic theme tokens over hardcoded colors and Tailwind palette classes.
- Arbitrary layout, responsive variants, token references, `transparent` and
  `currentColor` remain valid.
- CSS custom-property definitions and TypeScript properties named `--…` own theme
  values and may define literal colors. They are not drift violations.
- The extra Oxlint rule inventories hex and color-function literals throughout
  application strings, including SVG attributes, inline styles and DOM assignments.
  It does not inspect static assets or evaluate dynamically constructed values.
- Tailwind selectors cover JSX class attributes, shared class variables and common
  class helpers. See the color-specific Oxlint configuration for exact selectors
  and restrictions. Named arbitrary colors currently have an explicit restricted
  list; this is not a full CSS color grammar.

## Existing debt

The checked-in baseline preserves existing diagnostics by file, rule and message,
with occurrence counts. Line movement does not create new debt, but a new value,
new file or extra occurrence fails lint. It is not a per-file allowance budget.
Removing an occurrence leaves its allowance until the baseline is refreshed;
refresh after intentional cleanup to retire it. Never refresh merely to silence
new violations. Review every baseline diff.

## Tool selection

| Option                                                                                         | Assessment                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Better Tailwind CSS](https://github.com/schoero/eslint-plugin-better-tailwindcss)             | Selected for v4 class restrictions through existing Oxlint; ESLint is optional, not installed. Only color restrictions are enabled, not formatting rules. |
| [Stylelint](https://stylelint.io/user-guide/rules/)                                            | Selected for CSS declarations, including shorthand, gradients, shadows and keyframes. Core rules avoid another plugin dependency.                         |
| [Tailwind ESLint plugin](https://github.com/francoismassart/eslint-plugin-tailwindcss)         | Partial/beta v4 support; banning arbitrary values also bans legitimate layout values.                                                                     |
| [Strict-value Stylelint plugin](https://github.com/AndyOGo/stylelint-declaration-strict-value) | Useful for broader token enforcement, but function exemptions and shorthand expansion need care. Not needed for this initial color policy.                |
| [Biome](https://biomejs.dev/linter/rules/use-sorted-classes/)                                  | Built-in class sorting does not enforce this color policy. Adding another general-purpose linter is unnecessary.                                          |
| [Prettier Tailwind plugin](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)        | Sorts classes; does not prevent color drift.                                                                                                              |
| Custom standalone checker                                                                      | Flexible, but would duplicate parsing and class extraction. A small Oxlint inventory rule complements the maintained tools instead.                       |

[Oxlint JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) are still
alpha. The tooling tests exercise the actual plugin integration and CSS linting,
as well as baseline behavior. Do not add autofix mappings without reviewing the
visual and semantic impact.

## Dependency caveats

The selected Stylelint dependency tree currently inherits
[a braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The runner supplies repository-owned glob patterns, not user input. npm's proposed
fix downgrades Stylelint to an unsuitable historical release; do not apply it
blindly. Revisit the dependency when an appropriate upstream fix is available.

## Cleanup decisions still open

The initial cleanup preserves exact values while centralizing repeated control
surfaces, menu backgrounds, recesses, scrims, switch knobs and shared shadows.
The remaining baseline is deliberately not treated as an autofix list:

| Area                                            | Decision needed                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Terrain, feature SVGs and pawn accents          | Are authored artwork palettes valid local data, or must every illustration color become a global token?            |
| Team, damage, healing and combat-effect colors  | Which distinctions must remain, and which should share semantic feedback tokens?                                   |
| Destructive-action reds and online error text   | Should these use one danger palette or retain different emphasis levels?                                           |
| Biome panel fallbacks                           | Different fallback values exist. Which fallback is canonical, and should it vary between menu and battle contexts? |
| Decorative gradients, masks and one-off shadows | Which are intentional artwork rather than reusable UI styling?                                                     |
| Gold campaign CTA and other near-match colors   | Which differences are intentional? Do not merge visually similar values without approval.                          |

Use the full report for exact remaining locations. No values in these categories
were normalized merely to make lint pass.
