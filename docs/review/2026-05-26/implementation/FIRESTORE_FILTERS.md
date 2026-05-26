# Firestore Read Narrowing — P1 #4 and #5

## Queries changed

### `card-repository.ts`

- `loadProfileCards({ accountUserId, profileId, status = "active" })` — added
  `where("status", "==", status)` to the Firestore query when `status` is
  provided. Previously the function loaded every card for the profile and
  filtered by status in memory.
- `loadPackCards({ accountUserId, profileId, cardPackId, status })` — same
  treatment: status filter is now pushed down when supplied.

The in-memory `records.filter((c) => c.status === status)` post-filter is kept
intentionally as a defence-in-depth check (and to preserve test-db semantics).

Callers checked:

- `dashboard-repository.loadHomeDashboard` — already passed no explicit status,
  so it gets the default `"active"`. Behaviour unchanged, reads narrowed.
- `use-global-review-session` — same, default `"active"`. Behaviour unchanged.
- `card-repository.test.ts` — the existing test "loads only active cards"
  already exercises the default-active contract. Still passes.

No caller asked for archived/deleted cards through `loadProfileCards`, so no
opt-out helper (`loadAllProfileCards`) was needed. Anyone who later needs every
status can pass `status: undefined`.

### `scheduling-repository.ts`

The reviewer's instruction asked us to add `where("status", "==", "active")`
to `listSchedulingStatesForProfile`, but the `CardSchedulingState` entity
(`client/src/lib/api/entities/card-scheduling-state.ts`) has no `status`
field — only `due_at`, `last_reviewed_at`, `state`, and ownership fields. We
therefore did **not** add a fictitious status filter.

What we did instead:

- Added `listDueSchedulingStatesForProfile({ accountUserId, profileId, now })`
  which composes `where("due_at", "<=", now)` on top of the learner-ownership
  constraints. Existing callers were left on `listSchedulingStatesForProfile`
  because the dashboard's due-card calculation also has to count cards with no
  scheduling state (treated as due), so it legitimately needs all states.
  The new helper is available for callers that only need overdue work.

Boundaries respected: no entity types, DTOs, or unrelated repositories were
touched.

## Indexes updated (`client/firestore.indexes.json`)

Updated:

- `cards (account_user_id, profile_id, created_at)` →
  `(account_user_id, profile_id, status, created_at)`
- `cards (account_user_id, profile_id, card_pack_id, created_at)` →
  `(account_user_id, profile_id, card_pack_id, status, created_at)`

Added:

- `card_scheduling_states (account_user_id, learner_profile_id, due_at)` —
  supports the new `listDueSchedulingStatesForProfile` helper.

The existing `card_scheduling_states (account_user_id, learner_profile_id,
card_id, created_at)` index was left untouched (still used by
`listSchedulingStatesByCardIds`).

> Note: `card_scheduling_states` uses `learner_profile_id`, not `profile_id`.

## Estimated read impact

Order-of-magnitude back-of-envelope assuming a long-lived learner with N total
cards historically and an active set of ~A:

- Before #4: every dashboard / global-review load pulled N card docs even when
  only A < N were active (deleted/suspended cards accumulate over time).
- After #4: Firestore returns A docs directly. For a learner who has deleted
  ~50% of historical cards, that is a ~2x read reduction on every dashboard
  refresh. For heavy editors it can be much larger.

For #5 there is no immediate read reduction at the existing call site, but
the new `listDueSchedulingStatesForProfile` cuts reads from "all of a
learner's scheduling states" to "only states whose `due_at <= now`" — typically
a small fraction of the total deck on any given day.

## Deployment

`firestore.indexes.json` is staged but not deployed. The user must run
`firebase deploy --only firestore:indexes` (per task boundaries) before the
narrowed queries reach production.

## Verification

- `cd client && npx tsc -b` — clean
- `cd client && npm test -- --run` — 76/76 passing
