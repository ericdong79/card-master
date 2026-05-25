# MindMemo Client

React + TypeScript + Vite app for Card Master / MindMemo.

## Development

```sh
npm install
npm run dev
npm run build
npm run test -- --run
```

The production build is static and can be deployed to GitLab Pages. There is no app server deployed with the site.

## Firebase Configuration

The app uses Firebase Auth for Google sign-in and Firestore for cloud data storage. Create `client/.env.local` for local development, and configure the same values as GitLab CI/CD variables for Pages builds:

```sh
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Only use Firebase client-side web configuration values here. Do not include service account JSON, private keys, or other server credentials in Vite environment variables.

In the Firebase console, add each deployed app hostname to Authentication > Settings > Authorized domains. Local development usually needs `localhost`; GitLab Pages needs the exact Pages domain.

## Data Storage

Runtime data is stored in Firestore:

- `users/{firebaseUid}` stores account metadata and `current_profile_id`.
- `profiles` stores learner profiles scoped by `account_user_id`.
- Card packs, cards, mastery state, scheduling state, scheduling profiles, and review events are stored in their own Firestore collections.

User-scoped records use these fields:

- `account_user_id`: Firebase Auth `uid`.
- `profile_id`: current learner profile id for normal profile-owned data.
- `owner_user_id`: compatibility field that should match the learner profile id.
- `learner_profile_id`: used by scheduling state to avoid overloading algorithm `profile_id`.

Firestore rules and indexes are in:

- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json`

Avoid adding new Firestore query shapes that require composite indexes unless the index file and deployment notes are updated with the code change.

## Legacy Local Data Import

Older versions stored data in browser localStorage and IndexedDB. That local storage is no longer the runtime source of truth, but it remains supported as an import source.

To migrate old browser data:

1. Open the app on the same browser origin that has the old local data, for example `http://localhost:5174`.
2. Sign in with Google.
3. Open the user menu or Preferences.
4. Choose `Import local data`.
5. Confirm the import.

The import copies local profiles, packs, cards, scheduling state, mastery state, and review events into the signed-in Firestore account. It does not delete local data. Import IDs are deterministic, so retrying the same import should not create duplicate cloud records.
