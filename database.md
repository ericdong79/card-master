# Data Storage

## Overview

The application uses **IndexedDB** (browser local storage) for data persistence.
This provides offline-first capability and eliminates backend dependencies.

## Object Stores (IndexedDB)

### card_pack
Logical group of cards (similar to a deck).

**Schema:**
- `id` (string, pk): UUID
- `name` (string): Pack name
- `owner_user_id` (string): User identifier (currently "local-user")
- `status` (string): active | suspended | deleted
- `created_at` (string): ISO timestamp
- `updated_at` (string | null): ISO timestamp

### card
Individual flashcard with prompt and answer.

**Schema:**
- `id` (string, pk): UUID
- `card_pack_id` (string, fk): Reference to card_pack
- `prompt` (string): Question/prompt text
- `answer` (string): Answer text
- `status` (string): active | suspended | deleted
- `owner_user_id` (string): User identifier
- `created_at` (string): ISO timestamp
- `updated_at` (string | null): ISO timestamp

### scheduling_profile
Configuration for scheduling algorithms.

**Schema:**
- `id` (string, pk): UUID
- `algorithm_key` (string): e.g., "sm2"
- `version` (number): Algorithm version
- `parameters` (object): Algorithm-specific settings
- `owner_user_id` (string): User identifier
- `created_at` (string): ISO timestamp

### card_scheduling_state
Current scheduling state for each card (derived cache).

**Schema:**
- `id` (string, pk): UUID
- `card_id` (string, fk): Reference to card
- `profile_id` (string, fk): Reference to scheduling_profile
- `due_at` (string): ISO timestamp when card is due
- `state` (object): Algorithm-specific state (SM-2: ease, interval, phase, etc.)
- `last_reviewed_at` (string): ISO timestamp
- `last_event_id` (string | null): Reference to review_event
- `owner_user_id` (string): User identifier
- `created_at` (string): ISO timestamp

### review_event
Immutable record of each review session.

**Schema:**
- `id` (string, pk): UUID
- `card_id` (string, fk): Reference to card
- `grade` (number): 1-4 (Again/Hard/Good/Easy mapped to numbers)
- `time_ms` (number): Time spent reviewing
- `raw_payload` (object | null): Additional metadata
- `reviewed_at` (string): ISO timestamp
- `owner_user_id` (string): User identifier
- `created_at` (string): ISO timestamp

## Legacy PostgreSQL Schema

See `database-schema.sql` for the original PostgreSQL/Supabase design.
This is kept for architectural reference but is not used in the current implementation.
