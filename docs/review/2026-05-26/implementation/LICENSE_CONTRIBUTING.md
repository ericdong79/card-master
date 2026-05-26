# P2 D7 — LICENSE / CONTRIBUTING / PR template

Closes the D7 finding in
[`P2-medium.md`](../P2-medium.md): the repo had no `LICENSE`,
`CONTRIBUTING.md`, or pull-request template.

## License chosen

**MIT.** Reasoning:

- No existing license note was found in `AGENTS.md`, `README.md`,
  `client/package.json`, or any other top-level file (`grep` for
  `license|MIT|BSD|Apache` only hit research/review notes about the
  *missing* license).
- This is a single-maintainer personal project; the finding explicitly
  suggests MIT or Apache-2.0.
- MIT is the most permissive and the most common choice for projects of
  this size, with no patent claims or other complications that would
  push toward Apache-2.0.

Copyright holder: **Eric Dong**, 2026. Derived from
`git log -1 --format="%an"` (Eric Dong) and the GitHub remote
(`ericdong79/card-master`). Standard MIT text from
<https://opensource.org/licenses/MIT>.

## CONTRIBUTING.md sections

The new `CONTRIBUTING.md` covers:

1. **Overview** — single-maintainer flow: branch off `main`, push, open
   PR, merge after green CI + one approval.
2. **Setup** — pointer to root `README.md`.
3. **Commit convention** — Conventional Commits, with a table of the
   prefixes actually observed in `git log --oneline -30`: `feat`,
   `fix`, `perf`, `refactor`, `docs`, `chore`, `ci`. Optional scope
   noted (`fix(auth):`, `perf(packs):`, etc.). 50-char summary,
   72-char body wrap, *why* over *what*.
4. **Branching** — feature branches off `main`, no force-push to `main`,
   force-push allowed on un-reviewed feature branches.
5. **PR checklist** — mirrors the PR template:
   `npm test -- --run`, `tsc -b`, `npm run lint`, UI screenshots,
   schema/rules deploy notes, doc updates.
6. **Code review** — one approval + green CI required before merge;
   prefer small PRs.
7. **Where to find things** — root README, `docs/architecture/` (future
   home of the loose `*.md` files at root), `docs/review/2026-05-26/`
   for the current review backlog, `AGENTS.md` for agent conventions.

## Commit-convention summary (derived from `git log`)

```
feat:      new user-visible capability
fix:       bug fix (runtime, rules, build)
perf:      performance-only change
refactor:  internal restructure, no behavior change
docs:      documentation / comments / markdown only
chore:     tooling, deps, config
ci:        GitHub Actions, CI plumbing
```

Scope is optional but encouraged when it sharpens intent (examples taken
from recent history: `fix(auth):`, `perf(packs):`, `fix(rules):`,
`perf(review):`, `perf(fonts):`, `perf(firestore):`,
`fix(scheduling):`).

## PR template excerpt

`.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Summary

<!-- 1–3 bullets describing the change and motivation. -->

## Test plan

- [ ] `cd client && npm test -- --run` passes
- [ ] `cd client && npx tsc -b` is clean
- [ ] `cd client && npm run lint` is clean
- [ ] For UI changes: screenshot / Loom of the new behavior
- [ ] For schema / rules / index changes: described how / when to deploy

## Risk

## Linked issues / docs
```

## README touch

Added a short "Contributing" and "License" section at the bottom of
root `README.md`, pointing at `CONTRIBUTING.md`, the PR template, and
`LICENSE`.

## Out of scope (intentionally not done)

- `CODE_OF_CONDUCT.md` — not in the request; can be a follow-up.
- `CHANGELOG.md` — not in the request.
- `.github/workflows/` — another worktree is handling CI (D13).
- Any code under `client/src/`.

## Files

- `LICENSE` (new)
- `CONTRIBUTING.md` (new)
- `.github/PULL_REQUEST_TEMPLATE.md` (new)
- `README.md` (edited: added Contributing + License sections)
- `docs/review/2026-05-26/implementation/LICENSE_CONTRIBUTING.md` (this report)
