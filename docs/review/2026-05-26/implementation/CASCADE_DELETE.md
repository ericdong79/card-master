# P1 #6 — Pack cascade delete: parallelize queries, batch writes

## Problem

`createCardPackRepository().deletePackWithData` cascades a pack delete to its
cards, mastery states, scheduling states, and review events. For a 100-card
pack the read phase issued ~30 serial round trips, causing a 5–10s UI freeze
before any write started.

## Root cause

`productionReviewDataDeleteOperations` in
`client/src/lib/data/repositories/card-pack-repository.ts` iterated over
`chunkFirestoreInValues(cardIds)` with a `for...of` loop and awaited each
chunk before moving to the next. Within a chunk the three sub-collection
queries (`card_mastery_state`, `card_scheduling_state`, `review_event`) were
already `Promise.all`'d — so latency scaled linearly with chunk count, not
with the 3 collections.

## Fix

Fan out across BOTH dimensions:

```ts
Promise.all(
  chunks.map((chunk) => Promise.all([masteryQ, schedulingQ, eventQ]))
)
```

- Across chunks: parallel (was serial).
- Within chunk: parallel (already was).

Result: one effective RTT regardless of chunk count, bounded by the slowest
query.

## RTT count

`FIRESTORE_IN_FILTER_LIMIT = 10` (unchanged — see "What we did not change"
below). Card count `N`, chunks `C = ceil(N/10)`.

| Pack size | Before (serial chunks) | After (parallel chunks) |
|-----------|------------------------|-------------------------|
| 10 cards  | 1 chunk × 3 (parallel) = 1 RTT | 1 RTT |
| 50 cards  | 5 chunks × 1 RTT each = 5 RTT | 1 RTT |
| 100 cards | 10 chunks × 1 RTT each = 10 RTT | 1 RTT |
| 300 cards | 30 chunks × 1 RTT each = 30 RTT | 1 RTT |

(The original review finding cited "~30 RTT" by counting each
collection-query separately; our `Promise.all` over the three collections
already collapsed those to 1 RTT per chunk before this fix. The remaining
serialization across chunks is what this PR removes.)

For a 100-card pack we expect the read phase to drop from ~10 sequential
network RTTs to ~1 — roughly a 10x speedup on the slow side of the operation.

## Batch-write cap (500 ops) handling

Writes already flow through `commitBatchedWrites`
(`client/src/lib/data/firestore/batch-writer.ts`), which slices operations
into chunks of `FIRESTORE_BATCH_WRITE_LIMIT = 450` and commits them
sequentially. So a 200-card pack producing ~601 ops (200 cards + ~400
related docs + 1 pack) is split into two batches automatically. No change
required for the 500-op cap. The 450 limit leaves headroom under
Firestore's documented 500-write limit per `WriteBatch`.

## Retry safety

The recent commit `87bbf54` ("fix: make repository cleanup retry safe")
introduced the `pack && cards.length === 0` early-exit and tolerant pack
read. Our change is read-only inside the function — it builds the same
`BatchOperation[]` the original code did, just faster. The downstream
`commitBatchedWrites` path is untouched, so retry/cleanup semantics are
preserved. The retry test (`card-pack-repository.test.ts` →
"cleans remaining cards and review data when retrying after the pack is
already missing") still passes.

## What we did not change

- `FIRESTORE_IN_FILTER_LIMIT = 10` in `client/src/lib/data/firestore/id-chunks.ts`.
  Firestore raised the `in` operator limit to 30 in 2023, so this could be
  bumped to 30 for another ~3x reduction in chunk count. We did not bump
  it in this PR because the constant is shared with 6 other repositories
  (`card-mastery-state.ts`, `scheduling-state.ts`, `firestore-client.ts`,
  `scheduling-repository.ts`, `card-repository.ts`,
  `import-export-repository.ts`) and changing it should be a separate,
  benchmarked change with its own test pass. With chunks now parallel,
  the chunk-size win is much smaller anyway.
- No Cloud Function / server-side cascade — out of scope.
- No callers touched; `deletePackWithData` signature unchanged.

## Files changed

- `client/src/lib/data/repositories/card-pack-repository.ts` —
  parallelize across chunks in `productionReviewDataDeleteOperations`.

## Verification

- `cd client && npx tsc -b` — clean.
- `cd client && npm test -- --run` — 76 / 76 pass (19 test files).
