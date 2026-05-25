# Card Master Agent Notes

This file documents the current project state for future coding agents.

## Scope

- Main app lives in `client`
- Tech stack: React + TypeScript + Vite + Tailwind v4 + shadcn-style UI + Firebase Auth + Firestore
- Legacy local storage still exists only as an import source for pre-cloud browser data.

## Current UX Structure

- Global shell: `client/src/components/app-shell.tsx`
  - Left sidebar includes:
    - `Card Packs`
    - `Quick Start`
    - Bottom `User Section` (clickable, opens user menu)
  - Sidebar `System` section was removed from left navigation.
- User menu actions:
  - Switch user profile
  - Open Preferences
- Routes in `client/src/App.tsx`:
  - `/`
  - `/review` (global review across all packs)
  - `/pack/:cardPackId/cards`
  - `/pack/:cardPackId/review`
  - `/pack/:cardPackId/quick-review`
  - `/quick-start`
  - `/preferences`
- Home page header (`client/src/features/home/components/home-page-header.tsx`) now includes a global `Start Review` action.

## Card Creation UX (Latest)

- `pinyin-hanzi` card form (`client/src/features/cards/components/card-form-dialog.tsx`):
  - Input order is `Hanzi (answer)` first, then `Pinyin (question)`.
  - Convert button is placed next to Hanzi field and is disabled when Hanzi is empty.
  - Auto-convert runs when Hanzi is entered and Pinyin is still empty.
  - If user manually edits Pinyin, auto-convert no longer overwrites it.

## Duplicate Handling Rules

- Dedup logic is centralized at:
  - `client/src/lib/cards/deduplication.ts`
- Applied in:
  - `client/src/pages/pack-cards-page.tsx` for create / edit / bulk-create flows
- Rule matrix:
  - Hard-block for all pack types:
    - Same question + same answer
    - Same question + different answer
  - Same answer + different question:
    - `pinyin-hanzi`: hard-block (assume one-to-one mapping)
    - Other pack types: warning + user confirmation allows continue
- Bulk create behavior:
  - Duplicates are skipped (non-blocking).
  - UI shows a notice with skipped count.

## Profile System (Multi-user)

- Profile context: `client/src/features/profile/profile-context.tsx`
- Authentication is required before the app shell renders; Google sign-in is provided by Firebase Auth.
- Profile records are stored in Firestore `profiles`, scoped by `account_user_id`.
- The active account document is `users/{firebaseUid}` and stores `current_profile_id`.
- Legacy local profile storage key is `card-master.profiles.v1` (localStorage), used by the local-data import flow only.
- Profile shape:
  - `id`
  - `nickname`
  - `avatar_emoji`
  - `primary_color` (nullable)
  - `created_at`, `updated_at`, `last_used_at`
- First-launch behavior:
  - If no profile exists, force open create-profile dialog
  - After first profile creation, redirect to `/quick-start`
- Existing-launch behavior:
  - Reuse last active profile
- Data isolation model:
  - Firebase Auth `uid` is stored as `account_user_id`
  - Current profile `id` is stored as `profile_id`
  - `owner_user_id` is retained for compatibility and should match the current profile id for normal profile-owned data
  - Scheduling state uses `learner_profile_id` for the learner profile and keeps algorithm `profile_id` semantics separate

## Data Storage

- Default runtime storage is Firestore via `client/src/lib/api/firestore-client.ts`.
- IndexedDB support remains in `client/src/lib/api/indexeddb-client.ts` for legacy local data import and tests.
- Firestore collection names are defined in `client/src/lib/firebase/firestore.ts`.
- Firestore Rules and indexes live in:
  - `client/firestore.rules`
  - `client/firestore.indexes.json`
- Avoid adding Firestore queries that require new composite indexes unless the index file and deployment instructions are updated in the same change.

## Local Data Import

- Manual import entry points:
  - User menu: `Import local data`
  - Preferences page: `Import local data`
- Import source is browser-local IndexedDB/localStorage for the current origin.
- Import target is the signed-in Firebase account in Firestore.
- Import is copy-only and does not delete local data.
- Import IDs are deterministic so repeat attempts do not duplicate records.

## Preferences Page

- File: `client/src/pages/preferences-page.tsx`
- Current editable settings:
  - Nickname
  - Avatar (emoji picker)
  - Primary color
  - Daily goal (total completed cards per day)
  - Due cards per session
  - New cards per session
  - Default language
- Theme color can be reset to app default.

## Dynamic Theme Color

- Theme provider: `client/src/features/profile/theme-provider.tsx`
- Color helpers: `client/src/lib/theme/color.ts`
- Runtime CSS variables updated from active profile color:
  - `--primary`
  - `--primary-foreground`
  - `--ring`
  - `--sidebar-primary`
  - `--sidebar-primary-foreground`

## Language Preference

- i18n setup: `client/src/i18n.ts`
- Preference storage key: `card-master.preferences.language`
- Resolution priority:
  1. Saved preference from localStorage
  2. Browser language fallback
- Use `setPreferredLanguage(...)` instead of direct `i18n.changeLanguage(...)` when changing language from UI.

## Important Implementation Constraints

- Keep profile data separation via `account_user_id` + current profile id (do not introduce cross-profile queries by default).
- Preserve `owner_user_id` compatibility when creating user-scoped records.
- Prefer small, additive changes in storage/API surface.
- When adding new user-scoped data, ensure it is tied to Firebase `account_user_id` and current profile id.
- Build command:
  - `cd client && npm run build`
