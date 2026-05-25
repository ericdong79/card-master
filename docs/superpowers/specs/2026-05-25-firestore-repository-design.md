# Firestore Repository and Performance Design

Date: 2026-05-25

## Goal

Restructure the app's main data access around Firestore-native repositories so large reads and writes do not rely on IndexedDB-era single-record API loops. The first implementation stays entirely in the frontend Firebase SDK. Cloud Functions, Admin SDK, and persistent offline cache are out of scope for this phase.

Success means:

- Main app code no longer uses `createApiClient()` for normal cloud workflows.
- Large create, import, delete, and review persistence operations use batched Firestore writes.
- Profile-scoped reads use precise Firestore queries and shared in-memory cache where it reduces repeated waits.
- IndexedDB remains available only for deprecated local-data import and compatibility tests.
- New code has guardrails against reintroducing looped single-document network writes.

## Current Problems

The current data layer exposes a generic `ApiClient` with only `list`, `get`, `put`, and `delete`. That shape fits IndexedDB but encourages Firestore usage like:

- `for (...) await client.put(...)`
- `for (...) await deleteDoc(...)`
- `Promise.all(records.map(createCard))`
- broad profile/account reads followed by client-side filtering

Known hotspots include:

- Profile deletion queries account data and deletes matching documents one by one.
- Local-data import and JSON import write records in serial loops.
- Bulk card creation launches many single-record writes.
- Review persistence performs separate writes for review event, scheduling state, and mastery state.
- Home/dashboard loading is composed in React hooks from multiple lower-level calls.
- Pack deletion currently deletes the pack itself and does not own a complete Firestore-native cascade cleanup.

## Chosen Approach

Use domain repositories and services that express business operations directly. Do not expand the old `ApiClient` into a larger compatibility layer.

The new data layer is Firestore-native:

```text
client/src/lib/data/firestore/
  firestore-store.ts
  batch-writer.ts
  query-cache.ts
  ownership.ts

client/src/lib/data/repositories/
  card-repository.ts
  card-pack-repository.ts
  review-repository.ts
  scheduling-repository.ts
  profile-repository.ts
  import-export-repository.ts
  dashboard-repository.ts
```

The existing `client/src/lib/api/*` modules remain during migration but become legacy-facing. IndexedDB is treated as deprecated and should only support legacy local-data import, test fixtures, and any transitional code not yet moved.

## Repository Responsibilities

### Firestore Helpers

`batch-writer.ts` owns safe batched writes:

- Split writes into chunks of 450 operations to stay below Firestore's 500 operation limit.
- Support set, delete, and mixed operation batches.
- Treat zero operations as a no-op.
- Return enough metadata for tests and diagnostics, such as committed batch count and operation count.
- Invalidate cache only after successful commits.

`firestore-store.ts` owns low-level Firestore utilities:

- Collection-name mapping.
- Snapshot normalization.
- Firestore value sanitization.
- Query execution helpers.
- Document reference creation.

`ownership.ts` owns query builders:

- Profile-owned constraints: `account_user_id == uid` and `profile_id == profileId`.
- Learner-owned scheduling constraints: `account_user_id == uid` and `learner_profile_id == profileId`.
- Optional legacy fallback constraints for `owner_user_id` only where compatibility requires it.

`query-cache.ts` owns in-memory cache:

- Profile-scoped keys.
- TTL handling.
- Scope and resource invalidation.
- No persistent browser storage.

### Domain Repositories

`dashboard-repository.ts`

- `loadHomeDashboard(accountUserId, profileId)` returns packs with card counts and due card count.
- Internally queries packs, cards, and scheduling states with precise profile-scoped queries.
- Computes counts in memory.
- Uses a short cache TTL for composed dashboard data.

`card-repository.ts`

- `loadPackCards(accountUserId, profileId, cardPackId)` loads the pack and cards for a card page.
- `createCard`, `updateCard`, and `deleteCard` replace single-card API calls.
- `bulkCreateCards(...)` creates many cards through `BatchWriter`.
- Invalidates card, pack-card, and dashboard cache keys after writes.

`card-pack-repository.ts`

- `listCardPacks`, `createCardPack`, and `updateCardPack` cover normal pack operations.
- `deletePackWithData(accountUserId, profileId, cardPackId)` deletes:
  - the pack
  - cards in the pack
  - scheduling states for those cards
  - mastery states for those cards
  - review events for those cards
- Deletions use precise queries and batch chunks.

`review-repository.ts`

- `persistReviewResult(...)` replaces the current multi-step persistence helper.
- Reads the existing mastery state by card id.
- Writes review event, scheduling state, and mastery state in one batch when possible.
- Emits daily-review progress notification after successful persistence for non-Again grades.

`scheduling-repository.ts`

- Handles scheduling profile fetch/create.
- Lists scheduling states by card ids using Firestore `in` chunks.
- Provides lower-level functions used by review and dashboard repositories.

`profile-repository.ts`

- Keeps account/profile CRUD and current-profile updates.
- `deleteProfileWithData(accountUserId, profileId, nextCurrentProfileId)` deletes all profile-owned and learner-owned records with batch chunks.
- Uses `account_user_id + profile_id` as the primary deletion query.
- Uses `account_user_id + learner_profile_id` for scheduling state deletion.
- Uses `owner_user_id` only as a compatibility fallback, not as the primary path.

`import-export-repository.ts`

- Builds exports using precise profile and card-id queries.
- Imports JSON payloads by first constructing all target records in memory, then writing them through batch chunks.
- Keeps deterministic or generated id mapping behavior compatible with existing import semantics.
- Local-data import writes cloud records through this repository or a sibling local-import repository, not through serial `client.put` loops.

## Data Flow

### Home Page

The home hook calls:

```ts
dashboardRepository.loadHomeDashboard(accountUserId, profileId)
```

The repository returns:

```ts
{
  packs: CardPackWithCounts[];
  dueCardsCount: number;
}
```

The hook stops composing pack, card, and scheduling queries itself.

### Pack Cards Page

The page calls:

```ts
cardRepository.loadPackCards(accountUserId, profileId, cardPackId)
```

Bulk creation calls:

```ts
cardRepository.bulkCreateCards({
  accountUserId,
  profileId,
  cardPackId,
  cards,
})
```

Duplicate handling can remain in the page or move later. The write itself must be repository-owned and batched.

### Review

Review session creation can continue to use pure scheduling/review domain logic, but persistence calls:

```ts
reviewRepository.persistReviewResult(...)
```

The repository performs one mastery lookup and one batch write for the event/state/mastery changes.

### Delete Pack

Deleting a pack calls:

```ts
cardPackRepository.deletePackWithData(accountUserId, profileId, cardPackId)
```

The operation is not considered successful unless the cascade cleanup completes. If a later batch fails after earlier batches committed, the UI reports failure and the operation is retryable.

### Delete Profile

Deleting a profile calls:

```ts
profileRepository.deleteProfileWithData(
  accountUserId,
  profileId,
  nextCurrentProfileId,
)
```

The repository deletes related data before deleting the profile document and updating the account's current profile.

### Import

Import flows build all target records first, then write by store through `BatchWriter`. If a batch fails after earlier batches committed, the UI reports partial failure. Existing deterministic import ids and completion markers make retry safe for local-data import.

## Cache Strategy

Cache is frontend memory only. The first version is simple read-through cache with explicit invalidation.

Key format:

```text
accountUserId:profileId:resource:qualifier
```

Examples:

- `uid:profile:packs`
- `uid:profile:cards:all`
- `uid:profile:cards:pack:<packId>`
- `uid:profile:scheduling:cards:<hash>`
- `uid:profile:dashboard`

Default TTL is 60 seconds. Dashboard composed results should use a shorter TTL, around 15 to 30 seconds.

Invalidation rules:

- Create/update/delete pack: invalidate packs and dashboard for the profile scope.
- Create/update/delete card: invalidate cards, affected pack-card keys, and dashboard.
- Review persistence: invalidate scheduling, mastery, today's review-event count, and dashboard.
- Import: invalidate the whole profile scope.
- Delete profile: invalidate the whole profile scope.
- Switch profile: cache keys are profile-scoped, so old profile data is not reused.

Do not add persistent IndexedDB cache, Firestore realtime listeners, or stale-while-revalidate in this phase.

## Error Handling

Batch writes are not globally transactional across more than one Firestore batch. The design accepts this and makes retry behavior explicit.

Rules:

- Single review persistence should fit in one batch and fail as a unit.
- Bulk import and cascade delete may span multiple batches.
- If a multi-batch operation fails midway, the repository throws an error with operation context.
- UI must not show success after a partial failure.
- Import retry must not duplicate records where deterministic ids are already used.
- Delete retry should re-query remaining records and continue safely.

## Firestore Query and Index Policy

Prefer existing indexes in `client/firestore.indexes.json`.

Use these existing query shapes where possible:

- `account_user_id + profile_id + created_at`
- `account_user_id + profile_id + card_pack_id + created_at`
- `account_user_id + profile_id + card_id + reviewed_at`
- `account_user_id + learner_profile_id + card_id + created_at`

Avoid adding new composite indexes in the first pass. If implementation requires a new query shape, update `client/firestore.indexes.json` and deployment documentation in the same change.

Due counts can be computed in memory from profile-owned cards and scheduling states rather than introducing a new `due_at` composite index in this phase.

## Migration Plan Boundaries

The implementation should move active cloud workflows to repositories incrementally but decisively:

1. Add shared Firestore helpers, batch writer, and cache.
2. Add repositories with tests.
3. Move home/dashboard loading.
4. Move card pack and card page operations, including bulk create and pack delete.
5. Move review persistence.
6. Move profile deletion.
7. Move import/export and local cloud-write import.
8. Mark old `ApiClient` and IndexedDB client as deprecated for non-legacy use.
9. Add anti-regression scanning for looped single-record network writes.

Do not remove IndexedDB in this phase.

## Testing Strategy

### Batch Writer Tests

- Zero operations do not commit.
- 450 operations commit as one batch.
- 901 operations commit as three batches.
- Cache invalidation runs after successful commit.
- Failed commit throws and does not report success.

### Repository Tests

- Bulk create cards uses batched writes and returns generated records.
- Delete pack removes pack, cards, scheduling states, mastery states, and review events.
- Delete profile removes profile-owned and learner-owned records.
- Import writes generated records in batches and preserves ownership fields.
- Review persistence writes event, scheduling state, and mastery state consistently.
- Dashboard load returns correct pack counts and due counts.

### Anti-Regression Scan

Add a lightweight script or test that flags new patterns such as:

```text
for (...) await client.put
for (...) await client.delete
await deleteDoc inside a loop
Promise.all(... createCard(...))
```

The scanner may allow documented exceptions for tests and legacy IndexedDB import reads, but new main-app code should fail review when it uses these patterns.

### Verification Commands

Run:

```bash
cd client && npm run build
cd client && npm test -- --run
```

## Non-Goals

- No Cloud Functions or Admin SDK.
- No server-side recursive delete.
- No persistent offline cache redesign.
- No Firestore realtime listener migration.
- No full removal of IndexedDB.
- No unrelated UI redesign.

