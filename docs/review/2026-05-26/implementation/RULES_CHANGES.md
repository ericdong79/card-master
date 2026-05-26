# Firestore Rules Hardening — 2026-05-26

Addresses P0 review findings #1 (field immutability) and #2 (document size cap)
from `docs/review/2026-05-26/P0-critical.md`.

File modified: `client/firestore.rules` (only file changed).

## What was added

### Helpers

- `withinSizeLimit()` — `request.resource.size() < 100 * 1024` (100 KiB).
  Applied to every create and update across every mutating collection except
  delete. 100 KiB is well below Firestore's ~1 MiB hard limit but generous
  for the text-only card/scheduling-state payloads this app emits. If
  inline media data URLs are added to cards in the future, the cap should
  be raised intentionally; today images/audio that large should use Storage
  URLs.
- `unchanged(field)` — guards field-level immutability on update by
  comparing `request.resource.data[field]` to `resource.data[field]`.

### Per-collection hardening

For every mutating collection (`users`, `profiles`, `card_packs`, `cards`,
`scheduling_profiles`, `card_scheduling_states`, `card_mastery_states`,
`review_events`):

- Document size cap enforced on create + update.
- Ownership + foreign-key fields locked immutable on update.
- Required fields enforced on create via `keys().hasAll([...])`.
- Critical id fields checked with `is string`.

#### Locked-immutable fields by collection

| Collection | Locked on update |
|---|---|
| `users` | `id`, `created_at` (also: doc id must equal `auth.uid`) |
| `profiles` | `account_user_id`, `created_at` |
| `card_packs` | `account_user_id`, `profile_id`, `owner_user_id`, `created_at` |
| `cards` | `account_user_id`, `profile_id`, `owner_user_id`, `card_pack_id`, `created_at` |
| `scheduling_profiles` | `account_user_id`, `profile_id`, `owner_user_id`, `created_at` |
| `card_scheduling_states` | `account_user_id`, `learner_profile_id`, `owner_user_id`, `card_id`, `profile_id`, `created_at` |
| `card_mastery_states` | `account_user_id`, `profile_id`, `owner_user_id`, `card_id`, `created_at` |
| `review_events` | `account_user_id`, `profile_id`, `owner_user_id`, `card_id`, `created_at` |

Note that `card_scheduling_states` carries BOTH `learner_profile_id` (the
learner scope used for ownership) AND `profile_id` (which references the
scheduling-algorithm profile, not the learner). Both are locked immutable.

#### Required-on-create fields

`hasAll([...])` enforces presence of the ownership + foreign-key fields for
each collection (same set as the immutability list above, minus fields that
were already implied by ownership helpers). `is string` is checked for
ids/foreign keys only — not for free-form fields like `name`, `status`,
`parameters`, since those are optional or vary by record type.

## What was intentionally left flexible

- **No `keys().hasOnly([...])` constraints.** The schema has several
  optional fields (e.g. `updated_at: string | null`, `type?`,
  `last_event_id?`, `question_content?`, `raw_payload?`) plus a
  legacy-compat `owner_user_id`. Locking to a strict allow-list risks
  rejecting legitimate writes during the transition from local IndexedDB
  data. Marked as TODO inside the rules file (comments) for a future pass
  once the DTO surface is frozen.
- **No `is string` / `is number` checks on the long tail of fields.** Only
  the ids that participate in ownership/scoping are type-checked. Adding
  type checks to e.g. `mastery_score` is desirable but out-of-scope for
  this hardening pass and risks brittleness.
- **`review_events` updates are still allowed.** The domain model treats
  these as immutable, but the DTO does not yet expose a write path that
  guarantees this. Rules allow update only with all key fields unchanged,
  with a TODO to flip to `allow update: if false;` once verified.
- **`users` ownership uses doc id == uid.** The `users/{userId}` record
  does not carry an `account_user_id` field (see
  `client/src/lib/data/repositories/profile-repository.ts` line 40-48 —
  `AccountRecord` has no `account_user_id`). The doc id is the uid, so
  `isOwnUser(userId)` is sufficient and we don't apply the generic
  ownership helpers here. This is documented inline.

## TODOs

- Audit `review_events` write call sites and tighten to
  `allow update: if false;` once confirmed never updated.
- Add per-field type checks (`is number`, `is bool`, `is timestamp` / `is
  string`) for the rest of the schema after DTO stabilization.
- Add `keys().hasOnly([...])` allow-lists once optional-field set is frozen.
- The 100 KiB document cap is conservative. If product adds inline image
  data URLs to cards, revisit and either raise the cap or push those
  uploads to Firebase Storage (recommended).

## Known potential client breakages

Spot-checked the create paths in `client/src/lib/api/*.ts` against the new
required-fields lists:

- `client/src/lib/api/scheduling-state.ts:104-124` — `insertSchedulingState`
  writes all six required fields (`account_user_id`, `learner_profile_id`,
  `owner_user_id`, `card_id`, `profile_id`, `created_at`). OK.
- `client/src/lib/api/scheduling-state.ts:104` accepts a
  `LegacyCardSchedulingStateInsert` shape where `learner_profile_id` is
  optional. If a legacy caller ever insert-paths a record WITHOUT
  `learner_profile_id`, the new `hasAll([...])` check will reject it.
  Caller surface needs to be audited; ALL active cloud writes appear to go
  through the modern `CardSchedulingStateInsert` shape which requires the
  field. Flagging as a known risk.
- Account doc create at
  `client/src/lib/data/repositories/profile-repository.ts:245-254` writes
  `id`, `email`, `display_name`, `photo_url`, `current_profile_id`,
  `created_at`, `updated_at`. The new rule requires `id == userId` on
  create which matches the existing behavior. OK.
- Merge updates to the account doc at
  `client/src/lib/data/repositories/profile-repository.ts:283-290` only
  send `current_profile_id` and `updated_at`. Firestore evaluates
  `request.resource.data` as the POST-merge view, so the `unchanged('id')`
  and `unchanged('created_at')` checks pass as long as the document
  already contains those fields (which `ensureAccountRecord` guarantees on
  first sign-in).

No actual rule-violating call sites were identified. The legacy-shape
risk in `scheduling-state.ts` is the only theoretical concern and is
already gated behind the typed `CardSchedulingStateInsert` for cloud-mode
callers.

## Testing

Firebase CLI is not installed on this machine, so the emulator-based
rules test was skipped per the task instructions. Syntactic review only.
The rules file uses standard Firestore Security Rules v2 syntax with no
constructs beyond `request.auth`, `request.resource.data`, `resource.data`,
`.keys().hasAll()`, `.size()`, and the existing helper functions.
