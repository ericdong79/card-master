# P2 #12 PR 3 — `use-review-session` state machine

Replace the bag of independent `useState` calls in `use-review-session.ts`
with a single `useReducer` driven by a discriminated union, so impossible
phase combinations (`loading && error`, `grading && !cardPack`, etc.) become
unrepresentable at the type level.

## State shape

A discriminated union over the session phase, plus two cross-phase fields
that persist between phase transitions:

```ts
type ReviewSessionPhase =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; error: string }
  | ({ phase: "ready" } & LoadedSessionData)
  | ({ phase: "grading" } & LoadedSessionData)
  | ({ phase: "complete" } & LoadedSessionData);

type LoadedSessionData = {
  cardPack: CardPack;
  cards: Card[];
  session: ReviewSession;   // imperative class instance from lib/review
  currentCard: Card | null;
};

type ReviewSessionMachineState = ReviewSessionPhase & {
  totalReviewed: number;             // cumulative across all phases
  lastMasteryFeedback: MasteryFeedback | null;  // async, orthogonal to phase
};
```

Invariants TypeScript now enforces:

- `cardPack` / `cards` / `session` only exist once the session has loaded.
- `error` carries an error string, nothing else.
- Loading and error cannot coexist.
- `grading` cannot exist without a loaded session.

## Action union

```ts
type ReviewSessionAction =
  | { type: "load" }
  | { type: "loadSuccess"; cardPack; cards; session }
  | { type: "loadFailure"; error: string }
  | { type: "gradeStart" }
  | { type: "gradeSuccess" }
  | { type: "gradeFailure"; error: string }
  | { type: "skip" }
  | { type: "setMasteryFeedback"; feedback }
  | { type: "reset" };
```

Reducer is pure; invalid action/phase combinations return the current state
unchanged so a late async callback after navigation cannot corrupt the UI.
A `satisfies never` exhaustiveness check guarantees new actions force a case
update.

## Transitions covered by tests

19 unit tests in `use-review-session-state.test.ts`:

1. Initial state is `idle`.
2. `idle` → `loading` on `load`.
3. `loading` → `ready` on `loadSuccess` (with cards).
4. `loading` → `complete` on `loadSuccess` when session reports complete (no
   due cards).
5. `loading` → `error` on `loadFailure`.
6. `loadSuccess` ignored outside `loading`.
7. `loadFailure` ignored outside `loading`.
8. `ready` → `grading` on `gradeStart`.
9. `gradeStart` ignored outside `ready`.
10. `grading` → `ready` on `gradeSuccess`, `currentIndex` advances,
    `totalReviewed` increments.
11. `grading` → `complete` on `gradeSuccess` when the last card is graded.
12. `grading` → `error` on synchronous `gradeFailure`.
13. `ready` → `error` on async `gradeFailure` (persist callback after
    transition).
14. `gradeSuccess` ignored outside `grading`.
15. `skip` advances current card while staying in `ready`; does not bump
    `totalReviewed`.
16. `skip` ignored while `grading`.
17. `setMasteryFeedback` updates feedback in any phase without phase change.
18. `reset` returns to `initialReviewSessionState`.
19. `isLoadedPhase` narrows only `ready` / `grading` / `complete`.

## Test count

Before: 90 tests in `client/`.
After: 109 tests (90 + 19 new state-machine cases).

## Line count delta

| File | Before | After | Delta |
|---|---|---|---|
| `use-review-session.ts` | 276 | 337 | +61 |
| `use-review-session-state.ts` | — | 228 | +228 (new) |
| `use-review-session-state.test.ts` | — | 331 | +331 (new) |

The hook grew slightly because of the `projectPublicSurface` mapper that
preserves the legacy boolean-style return shape (`loading`, `error`,
`isComplete`) without breaking the one consumer `pack-review-page.tsx`. The
reducer's 228 lines are pure logic — no React — and are independently unit
tested.

## Public API

Unchanged. `UseReviewSessionReturn` and `ReviewSessionState` keep the same
fields; consumers (`pack-review-page.tsx`) need no modification.

`MasteryFeedback` is now a named exported type (moved out of the inline
return-type literal into the state module) — no consumer impact, it was
already structurally identical.

## P1 #8 integration

Confirmed: `loadDueCardWindow` from `client/src/features/review/lib/due-card-window.ts`
is **not** called from `use-review-session.ts`. It is consumed only by
`use-global-review-session.ts` (P1 #8's global review window). This PR does
not touch either of those files.

## Manual verification

The agent could not open the running app. The user should verify:

- **Happy path**: navigate to `/pack/:id/review` with a pack that has due
  cards → cards load → grade through several → session completes (summary
  shown).
- **Empty path**: navigate to a pack with no due cards → `pack-review-page`
  redirects to `/pack/:id/quick-review` (existing redirect logic preserved).
- **Error path**: simulate a Firestore failure (DevTools → block
  firestore.googleapis.com) on mount → error banner renders, session does
  not advance.
- **Pack-not-found**: navigate to `/pack/nonexistent-id/review` → error
  banner shows the `errors.packNotFound` translation.
- **Skip button**: in a ready session, click skip → current card changes,
  total reviewed counter does not increment.
- **Mastery toast**: grade a card while mastery presentation is enabled →
  toast appears with the new feedback.
- **Profile switch mid-session**: change profile via the app shell →
  effect re-runs, session resets cleanly (no flicker of stale cards).

## Follow-up note

`pack-review-page.tsx` has its own redirect-on-empty `useEffect` that
inspects several session fields (`session.loading`, `session.error`,
`session.isComplete`, `session.totalReviewed`, `session.cards.length`,
`session.totalCards`). It does not fight the state machine — it just reads
the projected boolean surface. No change needed here, but a future PR could
simplify by using the discriminated phase directly once the consumer
imports `isLoadedPhase` / phase types.
