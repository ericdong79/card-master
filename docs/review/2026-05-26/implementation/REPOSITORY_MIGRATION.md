# Repository pattern migration

Closes P2 #9 (the half-finished split between `lib/api/*` and
`lib/data/repositories/*`). The boundary is now clean and locked down by
a lint rule.

## What landed, by phase

Each phase is a separate commit on `main` so any single step can be
reverted in isolation.

### Phase 1 — Delete dead legacy api modules

`refactor(api): remove unused legacy api modules`

Removed two modules with zero references anywhere:

- `client/src/lib/api/review-event.ts`
- `client/src/lib/api/scheduling-state.ts`

The other "0-external-callers" candidates (`card.ts`, `ownership.ts`,
`scheduling-profile.ts`) still had intra-`lib/api/` references through
`card-pack.ts` and `card-mastery-state.ts`. They are deleted together
with `card-pack.ts` in Phase 3.

### Phase 2 — Consolidate card-mastery normalize into schemas

`refactor(api): move card-mastery normalize into schemas`

- Created `client/src/lib/api/schemas/card-mastery-state.ts`
  containing `CardMasteryStateSchema` and `normalizeCardMasteryState`,
  mirroring the existing `card-scheduling-state.ts` layout.
- Moved `client/src/lib/api/card-mastery-state.test.ts`
  to `client/src/lib/api/schemas/card-mastery-state.test.ts`.
- Updated the only two external callers:
  - `client/src/lib/data/repositories/card-repository.ts:3`
  - `client/src/lib/data/repositories/review-repository.ts:8`
- Deleted `client/src/lib/api/card-mastery-state.ts`. Its CRUD helpers
  (`listMasteryStatesByCardIds`, `getMasteryStateByCardId`,
  `insertMasteryState`, `updateMasteryState`, `upsertMasteryState`) had
  no callers outside the file itself.

### Phase 3 — Migrate UI to repositories

`refactor(features): use repositories instead of legacy api modules`

All five `features/home/components/*` callers of `lib/api/card-pack`
only imported the **type** `CardPackWithCounts`. Switched them to import
from `@/lib/data/repositories/card-pack-repository` (which re-exports
the same type that `use-home-page.ts` was already using):

- `client/src/features/home/components/card-pack-tile.tsx`
- `client/src/features/home/components/card-pack-list.tsx`
- `client/src/features/home/components/edit-pack-dialog.tsx`
- `client/src/features/home/components/delete-pack-dialog.tsx`
- `client/src/features/home/components/export-packs-dialog.tsx`

`client/src/features/home/components/import-packs-dialog.tsx` was
calling `parseCardMasterExport` from the `lib/api/import-export` shim.
Switched it to `@/lib/data/repositories/import-export-repository`
directly.

With UI callers gone, the following had no external callers and were
deleted:

- `client/src/lib/api/card-pack.ts`
- `client/src/lib/api/card.ts`
- `client/src/lib/api/ownership.ts`
- `client/src/lib/api/scheduling-profile.ts`

The thin shim `client/src/lib/api/import-export.ts` is kept for now
because it has 393 lines of integration tests
(`client/src/lib/api/import-export.test.ts`) that exercise an in-memory
`ApiClient`. Removing the shim cleanly would require porting those
tests to the repository test harness — out of scope for this PR.

### Phase 4 — Migrate non-UI non-repo callers

`refactor(review): drop legacy ApiClient usage from daily-goal and review-session`

- Inlined the single-line constant `LOCAL_OWNER_ID = "local-user"` into
  `client/src/lib/review/quick-review-session.ts` and
  `client/src/lib/review/review-session.ts`, then deleted
  `client/src/lib/api/local-user.ts`.
- `client/src/features/review/daily-goal.ts` previously exported an
  ApiClient-based `countTodayCompletedCards`. It had been superseded by
  `reviewRepository.countTodayCompletedCards` at every call site, so
  the function and its `ApiClient`/`firestore-client` imports were
  removed. The file still exports the (legacy-free) settings and event
  helpers.
- Deleted `client/src/lib/hooks/use-api-client.ts` (zero callers; its
  only purpose was exposing the deprecated client to components).
- `client/src/features/import/local-data-import.ts` was kept on
  `createApiClient` + `createIndexedDbApiClient`: it is the one
  legitimate IndexedDB bridge — it migrates legacy local data into the
  cloud, which is exactly what those adapters exist for.

### Phase 5 — Relocate the foundation under lib/data/

`refactor(data): relocate generic store clients under lib/data/`

The generic, deprecated store-client abstraction now lives next to the
actual data layer:

| From | To |
| --- | --- |
| `client/src/lib/api/client.ts` | `client/src/lib/data/store-client.ts` |
| `client/src/lib/api/firestore-client.ts` | `client/src/lib/data/firestore/firestore-client.ts` |
| `client/src/lib/api/firestore-client.test.ts` | `client/src/lib/data/firestore/firestore-client.test.ts` |
| `client/src/lib/api/indexeddb-client.ts` | `client/src/lib/data/indexeddb/indexeddb-client.ts` |

The `@deprecated` JSDoc on `ApiClient`, `createApiClient`,
`createFirestoreApiClient`, and `createIndexedDbApiClient` is preserved
— these modules are still pointing toward removal, just now in the
correct location. All consumer imports were updated to the new paths.

Deduplication between the higher-level `firestore-store.ts` and the
relocated `firestore-client.ts` was intentionally NOT attempted in this
PR: the two layers genuinely diverge (constraint helpers, caching,
batch coordination) and a clean merge would balloon the diff.
Follow-up: track which of `firestore-store.ts` and `firestore-client.ts`
new repositories should target and retire the other.

### Phase 6 — ESLint guard

`chore(lint): forbid direct firebase/firestore imports outside data layer`

Added a `no-restricted-imports` block in
`client/eslint.config.js` for `firebase/firestore`:

```js
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: [
    'src/lib/data/firestore/**',
    'src/lib/data/repositories/**',
    'src/lib/firebase/**',
  ],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'firebase/firestore',
        message: 'Direct firebase/firestore imports are restricted. Use repositories under @/lib/data/repositories/* instead.',
      }],
    }],
  },
}
```

Verified by introducing a temporary file with
`import { where } from "firebase/firestore"` outside the allowed paths
and confirming ESLint flagged it; the file was then removed.

## Summary tables

### Files deleted (8 modules + 1 hook)

- `client/src/lib/api/review-event.ts`
- `client/src/lib/api/scheduling-state.ts`
- `client/src/lib/api/card-mastery-state.ts`
- `client/src/lib/api/card-pack.ts`
- `client/src/lib/api/card.ts`
- `client/src/lib/api/ownership.ts`
- `client/src/lib/api/scheduling-profile.ts`
- `client/src/lib/api/local-user.ts`
- `client/src/lib/hooks/use-api-client.ts`

### Files moved

- `client/src/lib/api/card-mastery-state.test.ts` →
  `client/src/lib/api/schemas/card-mastery-state.test.ts`
- `client/src/lib/api/client.ts` →
  `client/src/lib/data/store-client.ts`
- `client/src/lib/api/firestore-client.ts` →
  `client/src/lib/data/firestore/firestore-client.ts`
- `client/src/lib/api/firestore-client.test.ts` →
  `client/src/lib/data/firestore/firestore-client.test.ts`
- `client/src/lib/api/indexeddb-client.ts` →
  `client/src/lib/data/indexeddb/indexeddb-client.ts`

### Files added

- `client/src/lib/api/schemas/card-mastery-state.ts` — Zod schema +
  `normalizeCardMasteryState`.
- `docs/review/2026-05-26/implementation/REPOSITORY_MIGRATION.md`
  (this file).

### New repository functions

None. All UI callers already had repository equivalents; the migration
was a pure import-redirect plus dead-code removal. The legacy
`countTodayCompletedCards` function in `daily-goal.ts` was deleted
because `reviewRepository.countTodayCompletedCards` was the only
function actually being called.

### `@deprecated` notes preserved

- `lib/data/store-client.ts` — `ApiClient` type and `createApiClient`
  factory are still tagged. Consumers are
  `features/import/local-data-import.ts` (legitimate IndexedDB
  bridge), `lib/api/import-export.ts` (shim with integration tests),
  and several repositories that accept an `ApiClient` to remain
  test-friendly via the in-memory `RepositoryTestDb` path.
- `lib/data/firestore/firestore-client.ts` — entire module tagged.
  Used by repositories + `import-export.ts` shim for the legacy in-memory
  test path.

These are intentional: the abstraction still has real users and
removing it would require either rewriting the import-export
integration test suite or replacing the legacy local-data-import
path. Both are tracked as follow-ups.

## Verification at HEAD

- `cd client && npx tsc -b` — clean
- `cd client && npm test -- --run` — **90 tests passed** (no delta from
  the pre-migration baseline of 90)
- `cd client && npm run lint` — clean

## Remaining `lib/api/` layout

```
client/src/lib/api/
  dtos/                # type-only DTOs, untouched
  entities/            # type-only entities, untouched
  schemas/             # Zod schemas (now incl. card-mastery-state)
  utils/               # generic utils (id, time)
  import-export.ts     # @deprecated shim retained pending test migration
  import-export.test.ts
```

A future PR can finish the job by either porting
`import-export.test.ts` to use the repository directly and deleting
the shim, or by accepting the duplication and moving `entities/`,
`dtos/`, `utils/`, and `schemas/` under `lib/data/`.
