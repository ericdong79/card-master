# Zod runtime validation at Firestore + import boundaries

Closes P2 #10 (SM-2 params / scheduling-state reads) and P2 #11 (import payload).

## What was loose

- `client/src/features/review/hooks/review-session-loader.ts:44` — cast
  `schedulingProfile.parameters as Partial<Sm2Parameters>`. Firestore can
  return anything; `normalizeSm2Parameters` would silently merge garbage
  into defaults and SM-2 would run on it.
- `client/src/lib/api/scheduling-state.ts` `updateSchedulingState` did a
  bare `{...existing, ...updates}` merge with no normalization — unlike
  `updateMasteryState` which calls `normalizeCardMasteryState`.
- `client/src/lib/data/repositories/import-export-repository.ts:107-129`
  `assertPayload` only checked top-level structure. Per-item card / pack /
  scheduling-profile / review-event fields were never validated, so a
  hand-edited or attacker-crafted JSON could write garbage straight into
  Firestore.

## Schemas added

All under `client/src/lib/api/schemas/`:

- `sm2-parameters.ts` — `Sm2ParametersSchema` + `parseSm2Parameters(input)`.
  Partial-validates per field (so missing fields fall back to defaults
  silently — the legacy `parameters: {}` case stays idiomatic), warns on
  present-but-wrong-type fields and strips them.
- `card-scheduling-state.ts` — `CardSchedulingStateSchema` +
  `normalizeCardSchedulingState(record)`. Mirrors the
  `normalizeCardMasteryState` pattern.
- `review-event.ts` — `ReviewEventSchema`. Loose `raw_payload` (multi-algo).
- `import-payload.ts` — full `.strict()` schemas for the export payload:
  `ImportPayloadSchema`, `CardSchema`, `CardPackSchema`,
  `SchedulingProfileSchema`, `CardSchedulingStateImportSchema`,
  `ReviewEventImportSchema`, `CardMasteryStateImportSchema`,
  `ExportReviewStateSchema`. Exports `parseImportPayload(input)` which
  accumulates issues across every malformed item before throwing a single
  `ImportPayloadValidationError`.

## Wiring sites

1. `client/src/features/review/hooks/review-session-loader.ts` — the
   `parameters as Partial<Sm2Parameters>` cast is gone, replaced by
   `parseSm2Parameters(schedulingProfile.parameters)`.
2. `client/src/lib/api/scheduling-state.ts` — `insertSchedulingState`,
   `updateSchedulingState`, and `upsertSchedulingState` now route writes
   through `normalizeCardSchedulingState` before `client.put(...)`.
3. `client/src/lib/data/repositories/scheduling-repository.ts` — Firestore
   reads pass through `parseSm2Parameters` on `scheduling_profile.parameters`
   and `normalizeCardSchedulingState` on every `card_scheduling_state` query
   helper, so downstream callers get a known-good shape at the boundary.
4. `client/src/lib/data/repositories/import-export-repository.ts` —
   `assertPayload` is now a one-liner delegating to `parseImportPayload`.
   `.strict()` rejects unknown fields and every card / pack / profile /
   review-event is fully validated.

## What is still loose (intentional)

- `card_scheduling_state.state` and `review_event.raw_payload` remain
  `z.record(z.string(), z.unknown())`. Multiple scheduling algorithms (SM-2
  today, future FSRS, etc.) write into these shapes. **TODO**: once a
  second algorithm lands, refactor `state` into a discriminated union keyed
  by `state.algorithm` and validate each variant per-algorithm.
- Firestore-read schemas are NOT `.strict()` (forward compatibility — new
  fields in newer schema versions must not crash older clients). Only the
  import payload is strict.
- The scheduling-state boundary normaliser does **not** drop wrong-typed
  fields the way `parseSm2Parameters` does — it only fixes `state` and
  `last_event_id`. Tightening this requires deciding what to do when a
  legacy document is missing `learner_profile_id` (recovery vs. drop). Out
  of scope here.

## Tests

- `client/src/lib/api/schemas/sm2-parameters.test.ts` — 5 tests: valid
  input passes, empty `{}` falls back to defaults silently, wrong-typed
  field is stripped + logs warn, non-object input returns defaults +
  warns, null/undefined returns defaults silently.
- `client/src/lib/api/schemas/import-payload.test.ts` — 6 tests: minimal
  valid payload, payload with valid cards/packs, missing required field
  with path reported, `.strict()` rejects unknown fields, multiple
  malformed cards reported in one error, malformed items accumulated
  across packs/cards/review_state.
- Existing `import-export.test.ts` updated: one assertion that pinned the
  old hand-rolled error message (`"Invalid export file: malformed
  review_state.card_mastery_states."`) is now a regex match on the new Zod
  path.

Verification: `npx tsc -b` clean, `npx vitest run` 22 files / 90 tests
passing (was 79 before — +11 new tests).

## Bundle size

`vite build` chunk diff:

- `scheduling-repository-*.js`: 1.99 KB → 74.14 KB (gzip 0.85 KB → 20.05 KB).
  Zod v4 landed inside the lazy scheduling-repository chunk, not the main
  entry.
- `index-*.js` (main bundle): unchanged at 141.53 KB gzip.

Net impact: ~+19 KB gzip on the lazy review-path chunk. Zod v4 is heavier
than the ~14 KB advertised because we use a large surface (`.strict()`,
`.partial()`, `record()`, nested objects). Acceptable for a feature that
trades silent data corruption for loud validation. If size becomes a
problem, `zod/mini` is a drop-in subset that ships at roughly half the
weight.
