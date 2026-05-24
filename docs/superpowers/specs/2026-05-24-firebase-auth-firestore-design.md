# Firebase Auth and Firestore Design

## Purpose

Card Master will keep deploying as a static app on GitLab Pages while adding real user authentication and cloud-backed per-user storage. Firebase Authentication will provide Google login. Cloud Firestore will become the primary application database. Existing IndexedDB and localStorage data will remain available only as a local import source.

The design preserves the current multi-profile learning model: one authenticated Google account can own multiple learner profiles, and each profile has isolated card packs, cards, review history, scheduling state, mastery state, and preferences.

## Decisions

- Use Firebase Authentication with Google sign-in.
- Require login before rendering the main application.
- Keep multiple learner profiles under one Firebase account.
- Use Cloud Firestore as the primary store.
- Import existing local data only after explicit user action.
- Continue deploying only static assets through GitLab Pages.
- Do not introduce a custom backend for the first implementation.

## Identity Model

The system has two identity layers:

- Account: the Firebase Auth user, identified by `auth.uid`.
- Profile: the learner profile currently selected inside the app.

Cloud data must include both identity fields:

```ts
account_user_id: string;
profile_id: string;
```

`account_user_id` is the security boundary and must always equal the Firebase `auth.uid` for the signed-in user. `profile_id` scopes data to one learner profile under that account.

The existing `owner_user_id` field will be kept during migration for compatibility. New Firestore writes will set:

```ts
owner_user_id: profileId;
account_user_id: uid;
profile_id: profileId;
```

Later cleanup can rename or remove `owner_user_id`, but the first implementation should not require a broad schema rename.

## Firestore Collections

The initial collection layout is flat:

```text
users/{uid}
profiles/{profileId}
card_packs/{packId}
cards/{cardId}
scheduling_profiles/{schedulingProfileId}
card_scheduling_states/{stateId}
card_mastery_states/{stateId}
review_events/{eventId}
```

Every profile document includes `account_user_id`. Every business document includes `account_user_id` and `profile_id`.

Flat collections keep existing ids and references close to the current IndexedDB model. They also make import/export and global review queries straightforward.

## Startup and Auth Flow

On app startup:

1. Initialize Firebase from Vite environment variables.
2. `AuthProvider` subscribes to Firebase Auth state.
3. While auth state is loading, show a blocking loading state.
4. If there is no user, render only the login page.
5. If a user exists, load or create `users/{uid}`.
6. Load profiles for `account_user_id == uid`.
7. Restore the account's last selected profile when possible.
8. If no profile exists, force the existing create-profile dialog.
9. Render the main application only after auth and profile state are ready.

The provider stack should be organized around these responsibilities:

```text
FirebaseProvider
  AuthProvider
    ProfileProvider
      ThemeProvider
        Router/App
```

The exact nesting can follow the existing `main.tsx` structure as long as Firebase auth state is available before profile and data calls run.

## User Interface Changes

The app becomes login-gated:

- Unauthenticated users see a simple Google sign-in page.
- The sidebar and routes are not rendered until the user is authenticated.
- The user section shows both account context and active profile context.
- User menu actions include switch profile, preferences, local-data import, and sign out.

Signing out clears in-memory account/profile state and returns to the login page. It does not delete local IndexedDB or localStorage data.

## Data Layer Design

The implementation should use a hybrid gradual migration:

- Keep the current entity-level API shape where practical.
- Add Firebase and Firestore modules under `client/src/lib/firebase`.
- Split storage clients under `client/src/lib/api`.
- Stop relying on arbitrary JavaScript `filter` functions for cloud reads.
- Implement Firestore queries per entity and per use case.

Suggested structure:

```text
client/src/lib/firebase/
  app.ts
  auth.ts
  firestore.ts

client/src/lib/api/
  indexeddb-client.ts
  firestore-client.ts
  client.ts
```

The old IndexedDB client remains available for local import. The main application uses the Firestore-backed data layer after login.

Entity APIs should accept both account and profile identity:

```ts
listCardPacks(client, accountUserId, profileId)
listCards(client, accountUserId, profileId, filters)
createCard(client, accountUserId, profileId, input)
```

Firestore reads must query by trusted identity fields:

```text
where("account_user_id", "==", uid)
where("profile_id", "==", profileId)
```

Additional filters, such as `card_pack_id`, should also be expressed as Firestore query constraints when possible.

## Local Data Import

Existing local data is not uploaded automatically.

Import entry points:

- A lightweight post-login prompt when local legacy data is detected.
- A stable action in Preferences.

Detection reads:

- IndexedDB database `card-master`.
- localStorage key `card-master.profiles.v1`.

The import preview shows counts for profiles, packs, cards, review events, scheduling states, mastery states, and scheduling profiles.

The default import mode is to create new cloud profiles from local profiles. This avoids merging local data into existing cloud profiles by accident.

Import writes generate new ids and maintain an id map:

```text
old profile id -> new profile id
old pack id -> new pack id
old card id -> new card id
old scheduling profile id -> new scheduling profile id
```

Each imported document is written with:

```ts
account_user_id: auth.uid;
profile_id: mappedProfileId;
```

For the optional "import into current cloud profile" mode, the existing duplicate rules should run and duplicate cards should be skipped with a summary.

Firestore writes are committed in small batches. Import is not all-or-nothing; completed writes remain if a later batch fails. Each imported record should include enough source metadata, such as `import_source_id` and `import_batch_id`, to make retries safe and understandable.

## Security Rules

Security rules must make `account_user_id` the authorization boundary.

Rules principle:

```js
allow read: if signedIn() && resource.data.account_user_id == request.auth.uid;
allow create: if signedIn() && request.resource.data.account_user_id == request.auth.uid;
allow update, delete: if signedIn()
  && resource.data.account_user_id == request.auth.uid
  && request.resource.data.account_user_id == request.auth.uid;
```

Profile documents follow the same rule. Users cannot create, read, update, or delete documents assigned to another Firebase account. Updates cannot move an existing document to another account.

The first implementation should focus on account isolation. More detailed validation, such as field allowlists and type checks, can be added after the core migration is stable.

## Indexes

Expected Firestore query indexes:

- `profiles`: `account_user_id`, `last_used_at desc`
- `card_packs`: `account_user_id`, `profile_id`, `created_at`
- `cards`: `account_user_id`, `profile_id`, `card_pack_id`, `created_at`
- `review_events`: `account_user_id`, `profile_id`, `card_id`, `reviewed_at`
- `card_scheduling_states`: `account_user_id`, `profile_id`, `card_id`
- `card_mastery_states`: `account_user_id`, `profile_id`, `card_id`
- `scheduling_profiles`: `account_user_id`, `profile_id`

Indexes should be generated from emulator or Firestore console errors during development, then committed as Firebase config if Firebase CLI config is introduced.

## Environment and Deployment

GitLab Pages continues to deploy the Vite build output.

Required Vite environment variables:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Firebase Web config is safe to expose in the browser. No service account, admin credential, or private key may be added to the client bundle.

Firebase Authentication authorized domains must include:

- Local development host.
- GitLab Pages production domain.
- Any custom production domain.

Google sign-in should prefer popup for the initial implementation. Redirect fallback can be added if popup behavior is unreliable in target browsers.

## Testing and QA

Automated tests:

- Keep existing scheduling, deduplication, and import/export unit tests.
- Add tests for auth/profile state transitions where practical.
- Add repository-level tests verifying Firestore payloads and query constraints include `account_user_id` and `profile_id`.
- Add import tests for id remapping and imported ownership fields.

Firebase emulator tests are recommended before production hardening, especially for Security Rules. They are not required to complete the first functional implementation if manual rule testing is done.

Manual QA checklist:

- Unauthenticated users see only the login page.
- Google login creates or loads the account.
- New users must create a profile before entering the app.
- Existing users restore their last selected profile.
- Profile A and profile B do not see each other's packs, cards, review state, or preferences.
- Creating packs and cards writes Firestore documents with correct ownership fields.
- Pack review and global review create review events and update scheduling/mastery state in the selected profile.
- Sign out returns to the login page and does not delete local legacy data.
- Local data import creates new cloud profiles by default.
- Local import retry does not silently duplicate already imported records.
- Direct client attempts to read or write another `account_user_id` are rejected by Firestore rules.

## Implementation Scope

In scope for the first implementation:

- Firebase setup for web.
- Google sign-in and sign-out.
- Login-gated app shell.
- Cloud profiles under one account.
- Firestore-backed card packs, cards, review events, scheduling state, mastery state, and scheduling profiles.
- Manual local data import.
- Security rules for account isolation.
- GitLab Pages environment configuration.

Out of scope for the first implementation:

- Custom backend.
- Realtime collaboration.
- Cross-device conflict resolution beyond last-write semantics.
- Full offline sync.
- Account deletion workflow.
- Billing, subscriptions, or admin tools.
- Removing the legacy `owner_user_id` field.

## Risks and Mitigations

- Risk: accidental cross-account access. Mitigation: every cloud document has `account_user_id`; Security Rules enforce it on read and write.
- Risk: expensive or broad Firestore reads. Mitigation: use entity-specific queries instead of generic `getAll + filter`.
- Risk: local test data uploaded by surprise. Mitigation: import is explicit and previewed.
- Risk: duplicate imports after partial failure. Mitigation: generate import metadata and report partial completion.
- Risk: migration touches many call sites. Mitigation: preserve entity-level API shape and change storage behavior behind it incrementally.
- Risk: GitLab Pages OAuth callback issues. Mitigation: use popup first and configure authorized domains before release.

## Acceptance Criteria

The design is implemented when:

- The app builds and deploys as a static GitLab Pages site.
- A user can sign in with Google and sign out.
- The main app is inaccessible while unauthenticated.
- One Google account can create and switch between multiple learner profiles.
- Firestore stores application data under `account_user_id + profile_id`.
- Security Rules prevent access to another account's data.
- Existing local data can be previewed and manually imported to new cloud profiles.
- Core workflows work against Firestore: create pack, create card, review pack, global review, preferences update, import/export where supported.
