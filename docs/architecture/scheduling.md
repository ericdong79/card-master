This document describes how scheduling algorithms are integrated into the system,
and how review events are transformed into updated scheduling states.

The design goal is to support multiple algorithms (e.g. SM-2, FSRS),
enable safe upgrades, and avoid destructive migrations.

---

## 1. Core Scheduling Loop

All scheduling algorithms must follow the same high-level lifecycle:

1. Load current scheduling state for a card
2. Load the triggering review event
3. Apply the algorithm-specific update rule
4. Produce:
   - a new scheduling state (refer to scheduling-state-schema.md)
   - a new `due_at` timestamp
5. Persist the updated scheduling state

This loop is deterministic given:
- previous state
- review event
- scheduling profile (algorithm + parameters)

---

## 2. Algorithm Interface Contract

Each scheduling algorithm must implement the following conceptual interface:

```ts
interface Scheduler {
  algorithmKey: string;
  version: number;

  applyReview(input: {
    previousState: SchedulingState | null;
    reviewEvent: ReviewEvent;
    profileParameters: object;
  }): {
    nextState: SchedulingState;
    dueAt: Date;
  };
}
```
Important constraints:

Algorithms must not mutate review events

Algorithms must not depend on database-side state beyond inputs

Output must be fully serializable into state jsonb

3. Scheduling Profiles
Scheduling behavior is defined by scheduling_profile.

A profile represents:

A concrete algorithm implementation

A specific parameter set

A versioned contract

Profiles allow:

Different users to use different algorithms

Gradual rollout of new algorithms

Shadow scheduling and A/B comparison

Example:

algorithm_key: "fsrs"

version: 5

parameters: { "desiredRetention": 0.9, "weights": [...] }

4. Active vs Shadow Scheduling (Optional)
The system may compute multiple scheduling outcomes for the same review event:

Active scheduling

Updates card_scheduling_state

Controls real due_at

Shadow scheduling

Computes alternative outcomes

Stored separately or logged

Used for validation or migration

Shadow scheduling must never affect user-visible behavior.

5. Lazy Migration Strategy
When upgrading scheduling algorithms or parameters:

Create a new scheduling profile

Do NOT migrate all cards immediately

For each card:

Continue using old profile until next review

On next review, recompute state using new profile

Update card_scheduling_state.profile_id

This ensures:

No blocking migrations

No downtime

Minimal risk

6. Failure Handling
If scheduling fails:

Review event must still be persisted

Scheduling state update may be retried

System must never lose review history

Review events are always the source of truth.

7. Invariants
Scheduling state is replaceable

Review events are immutable

Algorithms must be pure functions

Profiles are versioned and traceable

8. Summary
The scheduling system is designed as a pluggable, versioned engine.
All future algorithm evolution must respect this contract.
