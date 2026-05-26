# CI + Pre-Commit Hooks

Implements P2 #13 from the 2026-05-26 review: project had no CI for lint /
typecheck / test. Build-and-deploy on push to main was the only automation.

## What's in `.github/workflows/ci.yml`

Triggers:

- `pull_request` to `main` or `master`
- `push` to `main` or `master`

Concurrency: in-progress runs on the same ref are cancelled when new commits
arrive (`group: ci-${{ github.ref }}`, `cancel-in-progress: true`).

Four jobs run in parallel on `ubuntu-latest`, Node 22, with npm cache keyed
on `client/package-lock.json` (matches `deploy-pages.yml`). All steps run
with `working-directory: client`.

| Job        | Command                  | Why                                            |
| ---------- | ------------------------ | ---------------------------------------------- |
| lint       | `npm run lint`           | ESLint over `client/`                          |
| typecheck  | `npx tsc -b`             | Isolated tsc signal (also runs in build)       |
| test       | `npm test -- --run`      | Vitest one-shot (vitest defaults to watch)     |
| build      | `npm run build`          | Catches bundler/Vite issues lint/tsc may miss  |

Verified locally: lint clean, `tsc -b` clean, 79/79 tests pass, build succeeds.

## Husky + lint-staged

Added `husky` and `lint-staged` as devDependencies in `client/package.json`.

- `.husky/pre-commit` lives at repo root and runs `cd client && npx lint-staged`
  so it works despite `package.json` being inside `client/`.
- `lint-staged` config in `client/package.json` runs `eslint --fix` on staged
  `*.ts,*.tsx`.
- A `prepare` script in `client/package.json` (`cd .. && husky .husky`)
  configures git's `core.hooksPath` to the repo-root `.husky/` whenever any
  contributor runs `npm install` inside `client/`.

This was tested by running `npm run prepare` after install; the hook file is
executable and lives at `.husky/pre-commit`. Note: in a git worktree,
`core.hooksPath` from the main checkout already applies, so the hook may need
re-running after fresh clone — this is normal husky behaviour.

## Follow-ups (NOT done in this PR)

Per the original review, deeper ESLint rules would surface real issues but
also stall this PR with many pre-existing failures. They should be enabled
in a follow-up PR, one at a time, with a separate cleanup pass each:

- `@typescript-eslint/no-explicit-any` — likely many call sites use `any`.
- `@typescript-eslint/consistent-type-imports` — enforce `import type`.
- `no-restricted-imports` — e.g. forbid deep imports from `firebase/*` or
  internal modules across feature boundaries.
- `import/order` (via `eslint-plugin-import`) for stable import grouping.
- `react-hooks/exhaustive-deps` if not already on (it ships with
  `eslint-plugin-react-hooks` but the config should be checked).

Each should be added one by one with `--fix` runs and manual cleanup as
needed; not done here to keep this PR's scope tight.

## Files changed

- `.github/workflows/ci.yml` (new)
- `.husky/pre-commit` (new)
- `client/package.json` — added `husky`, `lint-staged` devDeps,
  `lint-staged` config block, `prepare` script.
- `client/package-lock.json` — updated by `npm install`.
