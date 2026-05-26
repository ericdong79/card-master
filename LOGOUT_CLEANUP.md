# Sign-out local data cleanup

Addresses P0 finding #3 (`docs/review/2026-05-26/P0-critical.md`): localStorage
and Firestore IndexedDB cache were not cleared on sign-out, leaking the
previous user's data to the next person on a shared browser.

## localStorage keys discovered

All keys live under the `card-master.` prefix.

| Key | Source | Per-user? | Action on sign-out |
| --- | --- | --- | --- |
| `card-master.profiles.v1` | `client/src/features/profile/local-profile-store.ts` | Yes (PII — profile names) | Cleared |
| `card-master.mastery.presentation.v1.<uid>` | `client/src/features/mastery/presentation/theme-storage.ts` | Yes | Cleared |
| `card-master.mastery.enabled.v1.<uid>` | `client/src/features/mastery/presentation/theme-storage.ts` | Yes | Cleared |
| `card-master.local-import.completed.v1:<uid>:<fingerprint>` | `client/src/features/import/local-data-import.ts` | Yes | Cleared |
| `card-master.preferences.language` | `client/src/i18n.ts` | No (device-level UI preference) | **Preserved** |
| `card-master.preferences.system.v1` | `client/src/lib/preferences/system-preferences.ts` | No (device-level system flags) | **Preserved** |

`card-master.preferences.language` and `card-master.preferences.system.v1` are
device-level preferences with no PII, so they intentionally survive sign-out
to avoid yanking the language back to English between user switches. They
live in an explicit allow-list in `client/src/lib/firebase/local-cleanup.ts`
(`PRESERVED_STORAGE_KEYS`) — anything added there must be reviewed for PII.

## What the helper does

`clearLocalAppStorage()` in `client/src/lib/firebase/local-cleanup.ts`:

1. Iterates every `localStorage` key.
2. Removes any key starting with `card-master.` **unless** the key is in
   `PRESERVED_STORAGE_KEYS`.

`clearFirestorePersistence()` in the same file:

1. Calls `terminate(db)` on the Firestore instance (required before clearing).
2. Calls `clearIndexedDbPersistence(db)` to wipe the cached Firestore docs.
3. All failures are caught and logged — sign-out is never blocked.

Both are called from `signOutOfFirebase()` in
`client/src/lib/firebase/auth.ts`. `clearLocalAppStorage()` is also called
from the `onAuthStateChanged` listener in
`client/src/features/auth/auth-context.tsx` as a cross-tab safety net (if
another tab signs out, this tab clears local storage too).

## Manual verification

1. Run `cd client && npm run dev` and open the app in a fresh Chrome profile.
2. Sign in as user **A** with Google. Use the app: create/select a profile,
   change the mastery theme, run a local-data import if any.
3. Open DevTools → Application → Local Storage. Confirm you see entries for:
   - `card-master.profiles.v1`
   - `card-master.mastery.presentation.v1.<A-uid>`
   - `card-master.mastery.enabled.v1.<A-uid>`
   - (if you imported) `card-master.local-import.completed.v1:<A-uid>:<fp>`
4. In DevTools → Application → IndexedDB, confirm a `firestore/...` database
   exists with cached docs.
5. Sign out from the in-app menu.
6. Refresh DevTools. Confirm:
   - All `card-master.*` keys above are **gone**.
   - `card-master.preferences.language` and `card-master.preferences.system.v1`
     (if set) are **still present**.
   - The Firestore IndexedDB database is empty or removed.
7. Sign in as user **B** with a different Google account. Confirm B does not
   see A's profile names, theme preference, or import-completion banner.
8. Cross-tab check: sign in as A in two tabs, sign out in tab 1, switch to
   tab 2 — the storage keys should be cleared there too (the listener runs
   when Firebase syncs the auth state).

## Tests

`cd client && npm test` — vitest suite continues to pass after the change.
