# Scheduling State Schema

This document defines the structure and expectations of the
`card_scheduling_state.state` JSON field.

The state object is algorithm-specific and versioned,
but must follow certain common principles.

---

## 1. Design Principles

- State is algorithm-private
- State is mutable and replaceable
- State must be reconstructable from review events
- State must be version-aware

---

## 2. Common Top-Level Fields (Recommended)

All state objects SHOULD include:

```json
{
  "schema_version": 1,
  "algorithm": "fsrs",
  "updated_at": "2025-01-10T10:30:00Z"
}
```
Purpose:

schema_version: allows safe evolution of JSON shape

algorithm: explicit identification

updated_at: debugging and auditing

3. SM-2 State Schema (Example)
```json
{
  "schema_version": 1,
  "algorithm": "sm2",
  "interval": 12,
  "ease": 2.45,
  "repetitions": 4,
  "lapses": 1
}
```
Notes:

interval is expressed in days

ease controls growth rate

repetitions tracks consecutive successes

lapses counts failures

4. FSRS State Schema (Example)
```
{
  "schema_version": 1,
  "algorithm": "fsrs",
  "difficulty": 4.2,
  "stability": 18.6,
  "last_review": "2025-01-08T09:20:00Z"
}
```
Definitions:

difficulty (D): intrinsic difficulty of the card

stability (S): time scale of memory decay

last_review: reference timestamp for decay calculations

Retention probability (R) is derived, not stored.

5. Schema Evolution Strategy
When state shape must change:

Increment schema_version

Support reading old versions

Write new versions only

Migrate lazily on next review

Never perform eager full-table migrations.

6. Validation Rules
State JSON must be self-contained

No foreign keys inside state

No duplicated data from other tables

All numeric values must be finite and valid

7. Debugging & Replay
To debug or replay scheduling:

Load review events in chronological order

Apply algorithm deterministically

Rebuild scheduling state

State must never contain information unavailable in events.

8. Summary
The scheduling state is a cached representation of memory.
Its schema must evolve carefully, with backward compatibility
and algorithm independence as first-class concerns.
