# Repo hygiene report — 2026-05-26

Resolves P0 issues D1, D2, D3 from `docs/review/2026-05-26/P0-critical.md`.

## Part A — Root README.md (D1)

Created `/README.md` at the repo root. Sections: title + one-liner, tech stack, local development quick start, scripts table, project structure, deployment, documentation links.

## Part B — client/README.md rewrite

Replaced the previous `client/README.md` (which despite the task brief was not literally the Vite template but a short MindMemo-flavoured note) with a structured client dev guide: quick start, env vars, scripts table, directory structure, repository-pattern migration note, Firestore configuration, and the legacy local import flow.

## Part C — Untrack `client/.env.production`, add `.env.example` (D2)

- `git rm --cached client/.env.production` — file is no longer tracked; the local copy remains on disk so the GitHub Pages build still picks it up until the workflow switches to secrets.
- Created `client/.env.example` with placeholder values for the six `VITE_FIREBASE_*` keys that were in `.env.production`, plus a header comment instructing the reader to copy it to `.env.local`.
- Updated root `.gitignore`: added an `.env*` block with `!.env.example` exception. The previous `*.local` line is preserved.

### Follow-up — GitHub Actions secrets (NOT done, flagged per instructions)

`.github/workflows/deploy-pages.yml` currently builds the client without injecting any environment variables — it relies on the committed `client/.env.production`. The relevant build step is:

```yaml
      - name: Install dependencies
        working-directory: client
        run: npm ci

      - name: Build
        working-directory: client
        run: npm run build
```

Once `client/.env.production` stops being committed, this step will produce a build with no Firebase config and Auth/Firestore will fail at runtime. Two follow-up items for the user:

1. Add the six `VITE_FIREBASE_*` values as GitHub Actions secrets (Settings -> Secrets and variables -> Actions).
2. Update the `Build` step to write them into the environment, e.g.:

   ```yaml
         - name: Build
           working-directory: client
           env:
             VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
             VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
             VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
             VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
             VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
             VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
           run: npm run build
   ```

Until that lands, do not delete the local `client/.env.production` from disk on the deployment branch.

## Part D — Untrack agent-tool configs (D3)

- `git rm -r --cached .codex .opencode .specify` — 14 files un-staged. Local copies remain on disk (per the task boundary "DO NOT delete files from disk").
- Updated root `.gitignore` to add `.codex/`, `.opencode/`, `.specify/`, `.claude/` next to the existing `.kilocode/` rule.

Note on a small contradiction in the task brief: Part D's code block shows `git rm -r .codex .opencode .specify` (which deletes from disk) but the "Boundaries" section explicitly says to use `--cached` and keep local copies. I followed the boundary.

## Summary of staged changes

```
deleted:    .codex/environments/environment.toml
modified:   .gitignore
deleted:    .opencode/skill/deep-research/SKILL.md
deleted:    .opencode/skill/deep-research/references/research-frameworks.md
deleted:    .specify/memory/constitution.md
deleted:    .specify/scripts/bash/check-prerequisites.sh
deleted:    .specify/scripts/bash/common.sh
deleted:    .specify/scripts/bash/create-new-feature.sh
deleted:    .specify/scripts/bash/setup-plan.sh
deleted:    .specify/scripts/bash/update-agent-context.sh
deleted:    .specify/templates/agent-file-template.md
deleted:    .specify/templates/checklist-template.md
deleted:    .specify/templates/plan-template.md
deleted:    .specify/templates/spec-template.md
deleted:    .specify/templates/tasks-template.md
new file:   README.md
new file:   client/.env.example
deleted:    client/.env.production
modified:   client/README.md
```

## Ambiguities / decisions noted

- Both READMEs and `HYGIENE_REPORT.md` reference `docs/review/2026-05-26/P0-critical.md` and `docs/review/2026-05-26/P2-medium.md`, but the current repo only has `docs/superpowers/`. The references in the new READMEs are placeholders that point at where those review docs are expected to live; they will resolve once D4 (docs reorg, P2) lands. Mentioned in the root README under "Project structure" so readers are not confused.
- `client/.env.production` was kept on disk so the current CI build does not break before the GH-Actions-secrets follow-up is done.
- `.claude/` was added to `.gitignore` even though no `.claude/` files are currently tracked, per the task brief.
