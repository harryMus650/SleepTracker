# Working on this project

Context for Claude Code. Read before changing anything.

## What this is

A personal sleep tracker for one user, Harry. Not a product, no users to support, no analytics. Optimise for honesty of the numbers and speed of daily logging, never for engagement.

## Rules that matter

**Never invent a number.** If the inputs for a metric are missing, return `null` and show a dash. `derive()` returns `se: null` when bed times are absent rather than estimating time in bed. An estimated efficiency is worse than none, because decisions get made on it. This has already been got wrong once — don't reintroduce it.

**Any change to the entry shape needs a migration.** `src/lib/store.js`, `MIGRATIONS` map, bump `SCHEMA`. Data outlives code. No exceptions.

**Keep `lib/` free of React.** Pure functions, testable in node. UI imports from lib, never the reverse.

**Health claims stay conservative.** The sleep window is real clinical protocol and carries real risk — the contraindication warning in `views/Plan.jsx` stays, and it stays specific about emergency-response work. The check-in questionnaire is deliberately original wording covering the same domains as standard screens; do not replace it with a reproduction of a copyrighted instrument.

## Voice

Plain and matter-of-fact. No exclamation marks, no cheerleading, no "Great job!". When the news is bad, say it plainly — "this is the size where focus and mood take the hit". Copy should read like a colleague who knows the subject, not an app.

## Conventions

- Storage keys namespaced `sleep:`
- Nights keyed by the morning you woke, `YYYY-MM-DD`
- Times as `"HH:MM"` strings, converted with `toMin` / `toHHMM`
- Durations in minutes throughout; format only at the edge with `durLabel`
- Colour semantics: mint good, dawn amber caution, coral cost

## Folding Baseline in

Baseline is the other tracker — daily log, shift board, training load, money, cross-domain signals. It should merge into this project rather than the other way round, because this one has the storage layer, migrations, PWA shell and module structure Baseline lacks.

Suggested order:

1. Add `src/lib/training.js` and `src/lib/money.js` alongside the existing lib modules. Keep them pure.
2. Namespace their storage `train:` and `money:`, matching the existing `sleep:` convention, with their own `SCHEMA` and migrations.
3. Add views as new tabs. The nav is a flat array in `App.jsx` — five tabs is already near the limit on a phone, so consider grouping rather than adding a sixth and seventh.
4. Signals last. Cross-domain correlations are the whole reason for merging, but they need both datasets populated before they say anything true. The existing `correlate()` in `diary.js` generalises — it takes a factor test and returns with/without means, and it already refuses to report below a minimum sample.

The daily log must stay one screen and under about 60 seconds. If merging makes logging slower, the merge has failed regardless of what the correlations show.

## Import path from the artifact versions

`store.js` `importInto()` accepts the old artifact export format and the original v1 shape (`bed`/`wake`/`awake`/`nap`). Paste JSON into Setup → Import. Migration `1` handles anything still in the v1 schema.
