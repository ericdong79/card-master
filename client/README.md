# Card Master — Client

React + TypeScript + Vite client for Card Master. See the repo root `README.md` for the project overview.

## Quick start

```sh
cp .env.example .env.local   # fill in real values from Firebase console
npm install
npm run dev
```

The dev server runs on Vite's default port. Sign-in needs the dev origin (usually `localhost`) listed in Firebase Authentication -> Settings -> Authorized domains.

## Environment variables

All client config is exposed via Vite `VITE_*` variables. The required keys are listed in `.env.example`. Local development uses `.env.local`; production builds read from `.env.production` (which is being migrated to GitHub Actions secrets — see `docs/review/2026-05-26/P0-critical.md` D2).

Only Firebase client-side web configuration belongs in these variables. Do not put service-account JSON, private keys, or other server credentials here.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/`. |
| `npm run test` | Run the Vitest test suite. |
| `npm run lint` | Run ESLint. |
| `npm run storybook` | Launch Storybook on port 6006. |
| `npm run build-storybook` | Produce a static Storybook build. |
| `npm run check:firestore-writes` | Guard against unbatched per-record Firestore writes (see `scripts/`). |
| `npm run preview` | Preview the production build locally. |

## Directory structure

- `src/features/` — feature modules: `auth`, `profile`, `cards`, `review`, `mastery`, `home`, `import`.
- `src/lib/` — shared libraries: Firebase wiring (`lib/firebase`), data access (`lib/data`, `lib/api`), SM-2 scheduling (`lib/scheduling`), card domain logic (`lib/cards`), preferences, theming, pinyin, hooks, and shared utilities.
- `src/components/` — shared UI primitives (Radix-based wrappers, app shell, layout chrome).
- `src/pages/` — route-level page components wired up by `src/App.tsx`.
- `src/i18n/` — locale resources and i18next setup (entry point is `src/i18n.ts`).
- `scripts/` — repo maintenance scripts run via `npm run` (currently the Firestore write guard).

## Repository-pattern migration (in progress)

The data layer is migrating from `src/lib/api/` (legacy, direct Firestore calls scattered across modules) to `src/lib/data/repositories/` (the target DAL). New features should add or extend a repository under `lib/data/repositories/`. Old call sites in `lib/api/` are being phased out incrementally — see `docs/review/2026-05-26/P2-medium.md` #9 for the migration plan and current status.

## Firestore configuration

The Firestore rules, indexes, and project wiring live alongside the client code:

- `firestore.rules` — security rules.
- `firestore.indexes.json` — composite index definitions.
- `firebase.json` — Firebase CLI configuration.

The current `firebase.json` wires Firestore only (no emulator suite, hosting, or functions config). To experiment with the Firestore emulator, add an `emulators` block to `firebase.json` and run `firebase emulators:start` from this directory; nothing else in the codebase assumes an emulator is running.

Avoid introducing new Firestore query shapes that need a composite index unless `firestore.indexes.json` is updated in the same change.

## Legacy local data import

Older versions stored data in browser `localStorage` / IndexedDB. That local store is no longer the source of truth but is still supported as a one-way import source. To migrate old browser data:

1. Open the app on the same origin that holds the old local data.
2. Sign in with Google.
3. Open the user menu or Preferences and choose `Import local data`.
4. Confirm the import.

Import IDs are deterministic, so retrying the same import will not create duplicate cloud records. The import does not delete the local data.
