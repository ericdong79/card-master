# Data Storage

## Overview

The current runtime data store is **Cloud Firestore**. Firebase Auth provides
the signed-in account identity, and the Firebase `uid` is stored on cloud
records as `account_user_id`.

Application records are scoped by both:

- `account_user_id`: the Firebase account that owns the data.
- The active learner profile id: stored as `profile_id` or
  `learner_profile_id` depending on the record type.

`owner_user_id` is retained for compatibility with the earlier local model. For
normal profile-owned data it should match the active profile id.

IndexedDB and localStorage are legacy browser-local stores only. They remain as
manual import sources for pre-cloud data and tests; they are not the default
runtime storage.

## Firestore Collections

Collection names are defined in `client/src/lib/firebase/firestore.ts`.

### users/{firebaseUid}

Account-level document keyed by the Firebase Auth `uid`.

- Stores account metadata such as `id`, `created_at`, and `updated_at`.
- Stores `current_profile_id`, the active learner profile for the account.
- Used to restore the last active profile after sign-in.

### profiles

Learner profiles available within a Firebase account.

- Scoped by `account_user_id`.
- Stores profile fields such as `nickname`, `avatar_emoji`, `primary_color`,
  `created_at`, `updated_at`, and `last_used_at`.
- The active profile id scopes normal app data and UI preferences.

### card_pack

Logical card pack/deck records. In Firestore these are stored in the
`card_packs` collection.

- Scoped by `account_user_id` and active profile ownership.
- Stores pack metadata such as `name`, `status`, `created_at`, and `updated_at`.
- `owner_user_id` is preserved for compatibility and should match the owning
  profile id for normal profile-owned data.

### card

Individual flashcard records. In Firestore these are stored in the `cards`
collection.

- Scoped by `account_user_id` and active profile ownership.
- References a pack through `card_pack_id`.
- Stores question/answer fields, card type payload, status, and timestamps.

### scheduling_profile

Scheduling algorithm configuration records. In Firestore these are stored in
the `scheduling_profiles` collection.

- Scoped by `account_user_id` and learner profile.
- Stores `algorithm_key`, `version`, and algorithm-specific `parameters`.
- The record `profile_id` identifies the scheduling algorithm profile and is
  intentionally separate from the learner profile id.

### card_scheduling_state

Current scheduling state for a card. In Firestore these are stored in the
`card_scheduling_states` collection.

- Scoped by `account_user_id` and `learner_profile_id`.
- References `card_id` and the scheduling profile through `profile_id`.
- Stores `due_at`, algorithm state, `last_reviewed_at`, and `last_event_id`.

### card_mastery_state

Aggregated mastery state for a card. In Firestore these are stored in the
`card_mastery_states` collection.

- Scoped by `account_user_id` and learner profile ownership.
- References `card_id`.
- Stores review counters, mastery metadata, and timestamps used by review and
  dashboard flows.

### review_event

Immutable record of a review action. In Firestore these are stored in the
`review_events` collection.

- Scoped by `account_user_id` and active learner profile.
- References `card_id`.
- Stores `grade`, review timing, optional raw payload, `reviewed_at`, and
  `created_at`.

## Rules And Indexes

Firestore security rules live in `client/firestore.rules`. Composite indexes
live in `client/firestore.indexes.json`.

When adding Firestore queries, update the index file in the same change if a new
composite index is required, and document any deployment step needed to publish
the rules or indexes.

## Legacy Local Import

The local import flow copies legacy IndexedDB/localStorage data from the current
browser origin into the signed-in Firebase account. It does not delete local
data. Import ids are deterministic so repeated imports do not create duplicate
cloud records.

See `database-schema.sql` for the early PostgreSQL/Supabase schema. That file is
kept for historical architectural reference only and is not used by the runtime
application.
