# Contributing to Card Master

Thanks for taking the time to contribute. Card Master is a small, mostly
single-maintainer project, but the workflow below keeps history clean and
review friendly. The expected flow is: open an issue or pick one up, branch
off `main`, push your changes, and open a pull request. Reviews happen on
the PR; once CI is green and there is at least one approval, the change is
merged into `main`.

## Setup

Local development instructions live in the root [`README.md`](./README.md).
Short version: `cd client && cp .env.example .env.local`, fill in the
Firebase keys, `npm install`, then `npm run dev`.

## Commit convention

This repo uses [Conventional Commits](https://www.conventionalcommits.org/).
Browsing `git log` shows the prefixes already in active use:

| Prefix      | When to use it                                                   |
| ----------- | ---------------------------------------------------------------- |
| `feat:`     | A user-visible new capability.                                   |
| `fix:`      | A bug fix in runtime behavior, rules, or build.                  |
| `perf:`     | Performance-only change; no behavior change expected.            |
| `refactor:` | Internal restructuring with no behavior or perf change intended. |
| `docs:`     | Documentation, comments, or markdown-only changes.               |
| `chore:`    | Tooling, dependencies, config; not shipped to users.             |
| `ci:`       | GitHub Actions workflows and other CI plumbing.                  |

Optional scopes are encouraged when they sharpen intent, e.g.
`fix(auth): clear local storage on sign out`, `perf(packs): parallelize
cascade delete queries`.

Message format:

- Summary line: imperative mood, 50 characters or fewer when practical.
- Blank line, then a body wrapped at 72 characters explaining *why* the
  change exists (not *what* — the diff already shows that).
- Reference issues / review findings in the body or a trailer
  (`Refs: docs/review/2026-05-26/P2-medium.md D7`).

## Branching

- All work lands on `main` through a pull request.
- Branch off the current `main`; rebase or merge `main` back in if your
  branch falls behind.
- `main` is never force-pushed. Force-push to your own feature branch is
  fine as long as the PR has not been reviewed yet.

## PR checklist

Before requesting review, please make sure:

- [ ] All tests pass locally: `cd client && npm test -- --run`
- [ ] Type-check is clean: `cd client && npx tsc -b`
- [ ] Lint is clean: `cd client && npm run lint`
- [ ] UI changes include a screenshot or short Loom of the new behavior.
- [ ] Schema, security-rules, or index changes describe how and when to
      deploy them.
- [ ] Relevant docs (root `README.md`, `docs/architecture/`, `AGENTS.md`)
      are updated.

The PR description should follow the
[`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md)
that GitHub auto-loads when you open a PR.

## Code review

- PRs need at least one approving review before merge.
- CI must be green. Do not merge with failing checks; if a check is
  flaky, fix the flake or skip with an explicit, time-boxed reason in
  the PR body.
- Prefer small PRs. Anything over ~400 lines of diff should justify its
  size up front.

## Where to find things

- Project layout, available scripts, and deployment notes: root
  [`README.md`](./README.md).
- Domain notes (Firestore schema, SM-2 scheduling, etc.):
  `database.md`, `scheduling.md`, `scheduling-state-schema.md` — these
  will move under `docs/architecture/` in a follow-up.
- Current code-review backlog and ongoing remediation:
  [`docs/review/2026-05-26/`](./docs/review/2026-05-26/).
- Coding-agent conventions and project state: [`AGENTS.md`](./AGENTS.md).
