# Global review session: windowed card loading (P1 #8)

## Problem

`useGlobalReviewSession` previously called:

1. `cardRepository.loadProfileCards(...)` — every active card in the profile.
2. `schedulingRepository.listSchedulingStatesByCardIds({ cardIds })` — one
   scheduling state per card.

For a 500-card profile this is ~1000 Firestore document reads on every entry
to the review page, with all sorting and "what's due" filtering happening in
memory inside `ReviewSession.create`. Cold-start latency was 3–5 seconds.

## Strategy

Push the windowing into Firestore. We only need at most `reviewPerDay +
newPerDay` (default 30) cards per session, so we should not pull anything
more than that.

The new flow:

1. Resolve `dailyGoal`, `reviewPerDay`, `newPerDay` up front via
   `normalizeDailyReviewSettings`. From these, derive a `dueLimit` and
   `newLimit` (each over-fetched by 2x so the SM-2 selector still has slack
   after we drop cards from inactive packs).
2. Query the next batch of **due** scheduling states with
   `where("due_at", "<=", asOf) orderBy("due_at", "asc") limit(dueLimit + 1)`.
   The `+1` probe drives a `hasMoreDue` flag on the result.
3. Hydrate only those cards via `where("id", "in", chunk)` (existing 10-id
   chunking primitive in `chunkFirestoreInValues`).
4. Drop cards whose pack is inactive or whose status is not `active`.
5. If the session still has appetite for new cards, load the profile's active
   card list once and pick the first `newLimit` cards that do **not** have a
   scheduling state. This residual scan is only issued when `newLimit > 0`,
   so a learner who has burned their daily new-card budget pays zero cost for
   it.
6. Hand the assembled `{ cards, schedulingStates }` to `buildSm2ReviewSession`
   exactly as before — the SM-2 algorithm, hook return shape, and persistence
   path are unchanged.

## Files touched

- `client/src/features/review/lib/due-card-window.ts` *(new)* — orchestrator.
  Exports `loadDueCardWindow({...})` and the `DueCardWindow` shape (cards,
  schedulingStates, hasMoreDue, hasMoreNew).
- `client/src/features/review/lib/due-card-window.test.ts` *(new)* — 3 tests
  covering window truncation, new-card injection, and inactive-pack filtering.
- `client/src/features/review/hooks/use-global-review-session.ts` — replaces
  the two eager loads with `loadDueCardWindow`. External hook API
  (`UseGlobalReviewSessionReturn`) is unchanged; the only consumer
  (`pages/global-review-page.tsx`) needs no edits.
- `client/src/lib/data/repositories/scheduling-repository.ts` — adds one
  narrow function `listDueSchedulingStatesForProfile({ asOf, limit })` that
  issues the windowed Firestore query (`due_at <= asOf`, `orderBy due_at
  asc`, `limit`). Added `orderBy`/`limit` imports from firebase.
- `client/src/lib/data/repositories/card-repository.ts` — adds one narrow
  function `loadCardsByIds({ cardIds })` for chunked hydration of a card-id
  set.

### Merge note re: the parallel firestore-filters worktree

That worktree may also add a windowed scheduling helper and a
`where("status", "==", "active")` filter on the scheduling-state collection.
At merge time the two `listDueSchedulingStatesForProfile` definitions should
be reconciled to a single canonical implementation that includes both the
`status == "active"` constraint and the `due_at <= asOf` ordered limit query.
The hook's call site only needs the merged helper to accept `{ accountUserId,
profileId, asOf, limit }` and return `CardSchedulingState[]`.

### Firestore index requirement

The new query needs a composite index on
`card_scheduling_state`: `account_user_id ASC, learner_profile_id ASC, due_at
ASC`. This index is **not** added in this branch — `firestore.indexes.json`
is owned by the firestore-filters worktree, which should add it. Until that
index exists Firestore will surface a clear console error with a one-click
link to provision it.

## Expected read-count reduction

For a profile with 500 active cards and default daily limits
(`reviewPerDay=20`, `newPerDay=10`, `dailyGoal=30`):

| scenario | before | after |
|---|---|---|
| user mid-session, plenty of due cards | ~500 cards + ~500 states ≈ **1000 reads** | 41 states (`(20*2)+1`) + ≤ 40 cards ≈ **~80 reads** |
| user has already exhausted new quota (`newLimit=0`) | ~1000 reads | ~80 reads, zero card-pool scan |
| user has very few due cards, needs new-card injection | ~1000 reads | ~40 states + 500 cards (new-card scan) ≈ **~540 reads** |

The worst case still touches the full active-card collection because of the
new-card pool scan, but the dominant scheduling-state read is now bounded
regardless of profile size. The firestore-filters worktree's `status` index
should further trim the new-card scan once it lands.

## Tests

- `cd client && npx tsc -b` — clean.
- `cd client && npx vitest run` — 79 passed (was 76; +3 from
  `due-card-window.test.ts`).
