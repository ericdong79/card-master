# Card Master

Card Master is a spaced-repetition flashcard app.

## Tech stack

- React 19 + TypeScript
- Vite (build + dev server)
- Firebase (Auth + Firestore) for sign-in and cloud data
- Tailwind CSS v4
- Radix UI primitives (shadcn-style wrappers)
- i18next + react-i18next for localization
- Vitest for unit tests
- Storybook for component development

## Local development

```sh
cd client
cp .env.example .env.local   # then fill in Firebase config
npm install
npm run dev
```

`.env.local` must contain the `VITE_FIREBASE_*` keys listed in `client/.env.example`. Pull the values from the Firebase console (Project settings -> Your apps -> Web app config).

## Available scripts

All commands assume you are inside `client/`.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `client/dist`. |
| `npm run test` | Run the Vitest test suite. |
| `npm run lint` | Run ESLint over the project. |
| `npm run storybook` | Launch Storybook on port 6006. |
| `npm run check:firestore-writes` | Static check that guards against unbatched per-record Firestore writes. |

## Project structure

- `client/` — the React app (all runtime code lives here).
- `docs/` — architecture notes, design specs, and code-review documents.
- `.github/` — GitHub Actions workflows used for deployment.
- `AGENTS.md` — project notes for coding agents.

Other top-level markdown files (`database.md`, `scheduling.md`, `scheduling-state-schema.md`, etc.) contain architecture references that will be consolidated into `docs/architecture/` in a follow-up.

## Deployment

Pushes to `main` are built and deployed by `.github/workflows/deploy-pages.yml`, which publishes the static client build to GitHub Pages. The runtime Firebase configuration is read from `client/.env.production` at build time; this value is being migrated to GitHub Actions secrets so that no environment file is tracked in the repo (see `docs/review/2026-05-26/P0-critical.md` D2).

## Documentation

- `database.md` — Firestore schema overview.
- `scheduling.md` — SM-2 scheduling algorithm and review state.
- `docs/review/2026-05-26/README.md` — most recent project review.
- `AGENTS.md` — current project state and conventions for coding agents.
