# Firebase Auth and Firestore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google login and Firestore-backed, account-and-profile-scoped storage while continuing to deploy Card Master as a static GitLab Pages app.

**Architecture:** Firebase Auth supplies the trusted account id. Firestore stores all cloud data with `account_user_id` and `profile_id`, while the existing IndexedDB client remains available for local legacy import. The migration is gradual: preserve entity-level APIs where practical, but make cloud reads use Firestore query constraints instead of JavaScript `filter` callbacks.

**Tech Stack:** React 19, TypeScript, Vite, Firebase Web SDK, Cloud Firestore, Firebase Auth, Vitest, GitLab Pages.

---

## Reference Documents

- Design spec: `docs/superpowers/specs/2026-05-24-firebase-auth-firestore-design.md`
- Project notes: `AGENTS.md`
- Build command: `cd client && npm run build`
- Test command: `cd client && npm run test -- --run`

## File Structure

Create these files:

- `client/src/lib/firebase/app.ts`: initializes Firebase from Vite env.
- `client/src/lib/firebase/auth.ts`: exports Auth helpers and Google sign-in provider.
- `client/src/lib/firebase/firestore.ts`: exports Firestore instance and collection names.
- `client/src/features/auth/auth-context.tsx`: owns Firebase auth state and sign-in/sign-out actions.
- `client/src/features/auth/login-page.tsx`: unauthenticated entry UI.
- `client/src/lib/api/indexeddb-client.ts`: contains the current IndexedDB implementation moved out of `client.ts`.
- `client/src/lib/api/firestore-client.ts`: Firestore-backed storage client plus query helpers.
- `client/src/lib/api/ownership.ts`: shared account/profile ownership helpers.
- `client/src/features/profile/profile-repository.ts`: Firestore profile reads/writes.
- `client/src/features/profile/local-profile-store.ts`: legacy localStorage profile reads for import.
- `client/src/features/import/local-data-import.ts`: legacy IndexedDB/localStorage import engine.
- `client/src/features/import/local-data-import.test.ts`: import id mapping and ownership tests.
- `client/src/features/import/local-data-import-dialog.tsx`: import preview and action UI.
- `client/firestore.rules`: Firestore account isolation rules.
- `client/firestore.indexes.json`: Firestore composite index config.
- `client/firebase.json`: Firebase config for rules/index deployment.
- `client/src/vite-env.d.ts`: Firebase env type declarations if it does not already contain `ImportMetaEnv`.

Modify these files:

- `client/package.json`: add `firebase`.
- `client/src/main.tsx`: wrap the app in `AuthProvider`.
- `client/src/App.tsx`: gate routes through auth/profile readiness if this is cleaner than doing it all in `AppShell`.
- `client/src/components/app-shell.tsx`: add signed-in account context, sign out, and import entry.
- `client/src/features/profile/profile-context.tsx`: load and persist profiles in Firestore under the signed-in account.
- `client/src/features/profile/theme-provider.tsx`: no behavior change expected; verify it still handles null profile.
- `client/src/lib/hooks/use-api-client.ts`: return the Firestore-backed client for signed-in app usage.
- `client/src/lib/api/client.ts`: keep shared types and route `createApiClient` to the main storage client.
- `client/src/lib/api/card-pack.ts`: accept account and profile identity and query by both.
- `client/src/lib/api/card.ts`: accept account and profile identity and query by both.
- `client/src/lib/api/review-event.ts`: write account/profile ownership fields.
- `client/src/lib/api/scheduling-profile.ts`: scope scheduling profiles by account/profile.
- `client/src/lib/api/scheduling-state.ts`: scope scheduling states by account/profile.
- `client/src/lib/api/card-mastery-state.ts`: scope mastery states by account/profile.
- `client/src/lib/api/import-export.ts`: export/import cloud data for the active account/profile.
- `client/src/features/home/hooks/use-home-page.ts`: pass `accountUserId` and `profileId`.
- `client/src/pages/pack-cards-page.tsx`: pass `accountUserId` and `profileId`.
- `client/src/features/review/hooks/use-review-session.ts`: pass `accountUserId` and `profileId`.
- `client/src/features/review/hooks/use-global-review-session.ts`: pass `accountUserId` and `profileId`.
- `client/src/features/review/hooks/use-quick-review.ts`: pass `accountUserId` and `profileId`.
- `client/src/pages/preferences-page.tsx`: use Firestore-backed profile preferences and expose import.
- `client/src/i18n/locales/en.json`: add auth/import strings.
- `client/src/i18n/locales/zh-CN.json`: add auth/import strings.

## Task 1: Install Firebase and Add Typed Firebase Initialization

**Files:**

- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Create: `client/src/lib/firebase/app.ts`
- Create: `client/src/lib/firebase/auth.ts`
- Create: `client/src/lib/firebase/firestore.ts`
- Modify or create: `client/src/vite-env.d.ts`

- [ ] **Step 1: Install Firebase SDK**

Run:

```bash
cd client && npm install firebase
```

Expected: `package.json` and `package-lock.json` include `firebase`.

- [ ] **Step 2: Add Vite env types**

Open `client/src/vite-env.d.ts`. If it only contains the default Vite reference, replace it with:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_FIREBASE_API_KEY: string;
	readonly VITE_FIREBASE_AUTH_DOMAIN: string;
	readonly VITE_FIREBASE_PROJECT_ID: string;
	readonly VITE_FIREBASE_STORAGE_BUCKET: string;
	readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
	readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
```

- [ ] **Step 3: Create Firebase app module**

Create `client/src/lib/firebase/app.ts`:

```ts
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const REQUIRED_FIREBASE_ENV = [
	"VITE_FIREBASE_API_KEY",
	"VITE_FIREBASE_AUTH_DOMAIN",
	"VITE_FIREBASE_PROJECT_ID",
	"VITE_FIREBASE_STORAGE_BUCKET",
	"VITE_FIREBASE_MESSAGING_SENDER_ID",
	"VITE_FIREBASE_APP_ID",
] as const;

function getRequiredEnv(name: (typeof REQUIRED_FIREBASE_ENV)[number]): string {
	const value = import.meta.env[name];
	if (!value) {
		throw new Error(`Missing Firebase environment variable: ${name}`);
	}
	return value;
}

export function getFirebaseApp(): FirebaseApp {
	if (getApps().length > 0) return getApp();

	return initializeApp({
		apiKey: getRequiredEnv("VITE_FIREBASE_API_KEY"),
		authDomain: getRequiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
		projectId: getRequiredEnv("VITE_FIREBASE_PROJECT_ID"),
		storageBucket: getRequiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
		messagingSenderId: getRequiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
		appId: getRequiredEnv("VITE_FIREBASE_APP_ID"),
	});
}
```

- [ ] **Step 4: Create Firebase Auth module**

Create `client/src/lib/firebase/auth.ts`:

```ts
import {
	GoogleAuthProvider,
	getAuth,
	signInWithPopup,
	signOut,
	type Auth,
	type User,
} from "firebase/auth";

import { getFirebaseApp } from "./app";

export function getFirebaseAuth(): Auth {
	return getAuth(getFirebaseApp());
}

export async function signInWithGoogle(): Promise<User> {
	const provider = new GoogleAuthProvider();
	provider.setCustomParameters({ prompt: "select_account" });
	const credential = await signInWithPopup(getFirebaseAuth(), provider);
	return credential.user;
}

export async function signOutOfFirebase(): Promise<void> {
	await signOut(getFirebaseAuth());
}
```

- [ ] **Step 5: Create Firestore module**

Create `client/src/lib/firebase/firestore.ts`:

```ts
import { getFirestore, type Firestore } from "firebase/firestore";

import { getFirebaseApp } from "./app";

export const FIRESTORE_COLLECTIONS = {
	users: "users",
	profiles: "profiles",
	cardPacks: "card_packs",
	cards: "cards",
	schedulingProfiles: "scheduling_profiles",
	cardSchedulingStates: "card_scheduling_states",
	cardMasteryStates: "card_mastery_states",
	reviewEvents: "review_events",
} as const;

export function getCardMasterFirestore(): Firestore {
	return getFirestore(getFirebaseApp());
}
```

- [ ] **Step 6: Verify TypeScript compilation**

Run:

```bash
cd client && npm run build
```

Expected: build passes or fails only because Firebase env vars are missing at build-time. If it fails because env access runs during build, add temporary `.env.local` development values from the Firebase project before continuing.

- [ ] **Step 7: Commit**

```bash
git add client/package.json client/package-lock.json client/src/vite-env.d.ts client/src/lib/firebase/app.ts client/src/lib/firebase/auth.ts client/src/lib/firebase/firestore.ts
git commit -m "feat: add firebase web initialization"
```

## Task 2: Add Auth Context and Login Gate

**Files:**

- Create: `client/src/features/auth/auth-context.tsx`
- Create: `client/src/features/auth/login-page.tsx`
- Modify: `client/src/main.tsx`
- Modify: `client/src/components/app-shell.tsx`
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/zh-CN.json`

- [ ] **Step 1: Create auth context**

Create `client/src/features/auth/auth-context.tsx`:

```tsx
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import {
	getFirebaseAuth,
	signInWithGoogle,
	signOutOfFirebase,
} from "@/lib/firebase/auth";

type AuthContextValue = {
	ready: boolean;
	user: User | null;
	accountUserId: string | null;
	signIn: () => Promise<void>;
	signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false);
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
			setUser(nextUser);
			setReady(true);
		});
		return unsubscribe;
	}, []);

	const signIn = useCallback(async () => {
		await signInWithGoogle();
	}, []);

	const signOut = useCallback(async () => {
		await signOutOfFirebase();
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			ready,
			user,
			accountUserId: user?.uid ?? null,
			signIn,
			signOut,
		}),
		[ready, signIn, signOut, user],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}
```

- [ ] **Step 2: Create login page**

Create `client/src/features/auth/login-page.tsx`:

```tsx
import { LogIn } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "./auth-context";

export function LoginPage() {
	const { t } = useTranslation();
	const { signIn } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSignIn() {
		setLoading(true);
		setError(null);
		try {
			await signIn();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("auth.login.failed"));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-6">
			<div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-normal">
						{t("auth.login.title")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t("auth.login.description")}
					</p>
				</div>
				<Button className="w-full" onClick={handleSignIn} disabled={loading}>
					{loading ? <Spinner size="sm" /> : <LogIn className="size-4" />}
					{t("auth.login.google")}
				</Button>
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
			</div>
		</div>
	);
}
```

- [ ] **Step 3: Wrap app with AuthProvider**

Modify `client/src/main.tsx` to:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import { AuthProvider } from "@/features/auth/auth-context";
import { ProfileProvider } from "@/features/profile/profile-context";
import { ProfileThemeProvider } from "@/features/profile/theme-provider";
import "./index.css";
import "./i18n";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<HashRouter>
			<AuthProvider>
				<ProfileProvider>
					<ProfileThemeProvider>
						<App />
					</ProfileThemeProvider>
				</ProfileProvider>
			</AuthProvider>
		</HashRouter>
	</StrictMode>,
);
```

- [ ] **Step 4: Gate AppShell by auth state**

In `client/src/components/app-shell.tsx`, import:

```ts
import { LogOut } from "lucide-react";
import { LoginPage } from "@/features/auth/login-page";
import { useAuth } from "@/features/auth/auth-context";
import { Spinner } from "@/components/ui/spinner";
```

Inside `AppShell`, read auth state:

```ts
const { ready: authReady, user, signOut } = useAuth();
```

Before rendering the shell layout, add:

```tsx
if (!authReady) {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<Spinner size="lg" />
		</div>
	);
}

if (!user) {
	return <LoginPage />;
}
```

Add a sign-out menu action near the existing user menu actions:

```tsx
<button
	type="button"
	className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
	onClick={() => {
		void signOut();
	}}
>
	<LogOut className="size-4" />
	{t("auth.signOut")}
</button>
```

- [ ] **Step 5: Add i18n strings**

In `client/src/i18n/locales/en.json`, add:

```json
"auth": {
	"login": {
		"title": "Sign in to Card Master",
		"description": "Use Google to sync your profiles, card packs, and review history.",
		"google": "Continue with Google",
		"failed": "Sign-in failed. Try again."
	},
	"signOut": "Sign out"
}
```

In `client/src/i18n/locales/zh-CN.json`, add:

```json
"auth": {
	"login": {
		"title": "登录 Card Master",
		"description": "使用 Google 同步你的档案、卡包和复习记录。",
		"google": "使用 Google 继续",
		"failed": "登录失败，请重试。"
	},
	"signOut": "退出登录"
}
```

Place these at the top level of each JSON object and keep valid commas.

- [ ] **Step 6: Verify build**

Run:

```bash
cd client && npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 7: Commit**

```bash
git add client/src/features/auth/auth-context.tsx client/src/features/auth/login-page.tsx client/src/main.tsx client/src/components/app-shell.tsx client/src/i18n/locales/en.json client/src/i18n/locales/zh-CN.json
git commit -m "feat: require firebase google sign in"
```

## Task 3: Split IndexedDB Client and Add Ownership Types

**Files:**

- Create: `client/src/lib/api/indexeddb-client.ts`
- Create: `client/src/lib/api/ownership.ts`
- Modify: `client/src/lib/api/client.ts`

- [ ] **Step 1: Move IndexedDB implementation**

Move the current IndexedDB implementation from `client/src/lib/api/client.ts` into `client/src/lib/api/indexeddb-client.ts`. Keep the same `openDatabase`, `promisifyRequest`, `applyQuery`, and implementation body, but export the factory as:

```ts
export function createIndexedDbApiClient(): ApiClient {
	// existing createApiClient body goes here unchanged
}
```

Import shared types from `client.ts`:

```ts
import type { ApiClient, QueryOptions, StoreName, StoreValue } from "./client";
```

- [ ] **Step 2: Keep shared API types in client.ts**

Update `client/src/lib/api/client.ts` so it contains the store map, public types, and the default factory:

```ts
import type { Card } from "./entities/card";
import type { CardMasteryState } from "./entities/card-mastery-state";
import type { CardPack } from "./entities/card-pack";
import type { CardSchedulingState } from "./entities/card-scheduling-state";
import type { ReviewEvent } from "./entities/review-event";
import type { SchedulingProfile } from "./entities/scheduling-profile";
import { createFirestoreApiClient } from "./firestore-client";

export type StoreValueMap = {
	card_pack: CardPack;
	card: Card;
	card_mastery_state: CardMasteryState;
	card_scheduling_state: CardSchedulingState;
	scheduling_profile: SchedulingProfile;
	review_event: ReviewEvent;
};

export type StoreName = keyof StoreValueMap;

export type StoreValue<S extends StoreName> = StoreValueMap[S];

export type QueryOptions<T> = {
	filter?: (record: T) => boolean;
	sortBy?: (a: T, b: T) => number;
};

export type ApiClient = {
	list<S extends StoreName>(
		store: S,
		options?: QueryOptions<StoreValue<S>>,
	): Promise<StoreValue<S>[]>;
	get<S extends StoreName>(store: S, id: string): Promise<StoreValue<S> | null>;
	put<S extends StoreName>(store: S, record: StoreValue<S>): Promise<StoreValue<S>>;
	delete<S extends StoreName>(store: S, id: string): Promise<void>;
};

export function createApiClient(): ApiClient {
	return createFirestoreApiClient();
}
```

- [ ] **Step 3: Create ownership helpers**

Create `client/src/lib/api/ownership.ts`:

```ts
export type CloudOwnership = {
	account_user_id: string;
	profile_id: string;
	owner_user_id: string;
};

export function createCloudOwnership(
	accountUserId: string,
	profileId: string,
): CloudOwnership {
	return {
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
	};
}

export function hasCloudOwnership(
	record: Partial<CloudOwnership>,
	accountUserId: string,
	profileId: string,
): boolean {
	return (
		record.account_user_id === accountUserId &&
		record.profile_id === profileId &&
		record.owner_user_id === profileId
	);
}
```

- [ ] **Step 4: Create temporary Firestore client shim**

Create `client/src/lib/api/firestore-client.ts` with a temporary implementation that delegates to IndexedDB while the rest of the plan migrates call sites:

```ts
import type { ApiClient } from "./client";
import { createIndexedDbApiClient } from "./indexeddb-client";

export function createFirestoreApiClient(): ApiClient {
	return createIndexedDbApiClient();
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd client && npm run test -- --run
```

Expected: existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/api/client.ts client/src/lib/api/indexeddb-client.ts client/src/lib/api/firestore-client.ts client/src/lib/api/ownership.ts
git commit -m "refactor: split local api client"
```

## Task 4: Add Firestore Client Implementation

**Files:**

- Modify: `client/src/lib/api/firestore-client.ts`
- Modify: `client/src/lib/api/entities/card-pack.ts`
- Modify: `client/src/lib/api/entities/card.ts`
- Modify: `client/src/lib/api/entities/review-event.ts`
- Modify: `client/src/lib/api/entities/card-mastery-state.ts`
- Modify: `client/src/lib/api/entities/card-scheduling-state.ts`
- Modify: `client/src/lib/api/entities/scheduling-profile.ts`

- [ ] **Step 1: Add cloud ownership fields to entity types**

For each entity type that currently contains `owner_user_id`, add optional cloud fields first to keep migration incremental:

```ts
account_user_id?: string;
profile_id?: string;
```

For `CardSchedulingState`, keep its existing `profile_id` field required because it refers to the scheduling algorithm profile. Add cloud ownership with `learner_profile_id`:

```ts
account_user_id?: string;
learner_profile_id?: string;
```

- [ ] **Step 2: Replace Firestore client shim**

Replace `client/src/lib/api/firestore-client.ts` with:

```ts
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	setDoc,
	where,
	type DocumentData,
	type QueryConstraint,
} from "firebase/firestore";

import {
	FIRESTORE_COLLECTIONS,
	getCardMasterFirestore,
} from "@/lib/firebase/firestore";
import type { ApiClient, QueryOptions, StoreName, StoreValue } from "./client";

const STORE_TO_COLLECTION: Record<StoreName, string> = {
	card_pack: FIRESTORE_COLLECTIONS.cardPacks,
	card: FIRESTORE_COLLECTIONS.cards,
	card_mastery_state: FIRESTORE_COLLECTIONS.cardMasteryStates,
	card_scheduling_state: FIRESTORE_COLLECTIONS.cardSchedulingStates,
	scheduling_profile: FIRESTORE_COLLECTIONS.schedulingProfiles,
	review_event: FIRESTORE_COLLECTIONS.reviewEvents,
};

function normalizeSnapshotValue<S extends StoreName>(
	storeName: S,
	id: string,
	data: DocumentData,
): StoreValue<S> {
	return {
		...data,
		id: typeof data.id === "string" ? data.id : id,
	} as StoreValue<S>;
}

function applyQueryOptions<T>(records: T[], options?: QueryOptions<T>): T[] {
	const filtered = options?.filter ? records.filter(options.filter) : records;
	if (options?.sortBy) return [...filtered].sort(options.sortBy);
	return filtered;
}

function defaultOrderConstraints(storeName: StoreName): QueryConstraint[] {
	switch (storeName) {
		case "review_event":
			return [orderBy("reviewed_at", "asc")];
		default:
			return [orderBy("created_at", "asc")];
	}
}

export function createFirestoreApiClient(): ApiClient {
	const db = getCardMasterFirestore();

	return {
		async list(store, options) {
			const constraints = defaultOrderConstraints(store);
			const snapshot = await getDocs(
				query(collection(db, STORE_TO_COLLECTION[store]), ...constraints),
			);
			const records = snapshot.docs.map((item) =>
				normalizeSnapshotValue(store, item.id, item.data()),
			);
			return applyQueryOptions(records, options);
		},
		async get(store, id) {
			const snapshot = await getDoc(doc(db, STORE_TO_COLLECTION[store], id));
			if (!snapshot.exists()) return null;
			return normalizeSnapshotValue(store, snapshot.id, snapshot.data());
		},
		async put(store, record) {
			await setDoc(doc(db, STORE_TO_COLLECTION[store], record.id), record);
			return record;
		},
		async delete(store, id) {
			await deleteDoc(doc(db, STORE_TO_COLLECTION[store], id));
		},
	};
}

export function ownershipConstraints(
	accountUserId: string,
	profileId: string,
): QueryConstraint[] {
	return [
		where("account_user_id", "==", accountUserId),
		where("profile_id", "==", profileId),
	];
}
```

This generic client still supports legacy filters. Later tasks remove broad reads from entity APIs by adding entity-specific constraints.

- [ ] **Step 3: Build**

Run:

```bash
cd client && npm run build
```

Expected: build passes.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/api/firestore-client.ts client/src/lib/api/entities
git commit -m "feat: add firestore api client"
```

## Task 5: Make ProfileProvider Account-Scoped and Firestore-Backed

**Files:**

- Create: `client/src/features/profile/profile-repository.ts`
- Create: `client/src/features/profile/local-profile-store.ts`
- Modify: `client/src/features/profile/profile-context.tsx`
- Modify: `client/src/features/profile/components/switch-profile-dialog.tsx`
- Modify: `client/src/features/profile/components/create-profile-dialog.tsx` only if prop types need async handling.

- [ ] **Step 1: Extract local profile storage**

Create `client/src/features/profile/local-profile-store.ts`:

```ts
import type { UserProfile } from "./profile-context";

export const PROFILE_STORAGE_KEY = "card-master.profiles.v1";

export type StoredProfileState = {
	profiles: UserProfile[];
	current_profile_id: string | null;
};

export function loadLocalProfileState(): StoredProfileState {
	if (typeof window === "undefined") {
		return { profiles: [], current_profile_id: null };
	}

	const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
	if (!raw) return { profiles: [], current_profile_id: null };

	try {
		const parsed = JSON.parse(raw) as Partial<StoredProfileState>;
		return {
			profiles: Array.isArray(parsed.profiles)
				? (parsed.profiles as UserProfile[])
				: [],
			current_profile_id:
				typeof parsed.current_profile_id === "string"
					? parsed.current_profile_id
					: null,
		};
	} catch {
		return { profiles: [], current_profile_id: null };
	}
}
```

- [ ] **Step 2: Create profile repository**

Create `client/src/features/profile/profile-repository.ts`:

```ts
import {
	collection,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	setDoc,
	where,
} from "firebase/firestore";

import {
	FIRESTORE_COLLECTIONS,
	getCardMasterFirestore,
} from "@/lib/firebase/firestore";
import type { UserProfile } from "./profile-context";

export type AccountRecord = {
	id: string;
	email: string | null;
	display_name: string | null;
	photo_url: string | null;
	current_profile_id: string | null;
	created_at: string;
	updated_at: string | null;
};

export type CloudUserProfile = UserProfile & {
	account_user_id: string;
};

export async function getOrCreateAccountRecord(input: {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoUrl: string | null;
	now: string;
}): Promise<AccountRecord> {
	const db = getCardMasterFirestore();
	const ref = doc(db, FIRESTORE_COLLECTIONS.users, input.uid);
	const snapshot = await getDoc(ref);
	if (snapshot.exists()) return snapshot.data() as AccountRecord;

	const record: AccountRecord = {
		id: input.uid,
		email: input.email,
		display_name: input.displayName,
		photo_url: input.photoUrl,
		current_profile_id: null,
		created_at: input.now,
		updated_at: null,
	};
	await setDoc(ref, record);
	return record;
}

export async function updateAccountCurrentProfile(
	accountUserId: string,
	profileId: string | null,
	now: string,
): Promise<void> {
	const db = getCardMasterFirestore();
	await setDoc(
		doc(db, FIRESTORE_COLLECTIONS.users, accountUserId),
		{ current_profile_id: profileId, updated_at: now },
		{ merge: true },
	);
}

export async function listCloudProfiles(
	accountUserId: string,
): Promise<CloudUserProfile[]> {
	const db = getCardMasterFirestore();
	const snapshot = await getDocs(
		query(
			collection(db, FIRESTORE_COLLECTIONS.profiles),
			where("account_user_id", "==", accountUserId),
			orderBy("last_used_at", "desc"),
		),
	);
	return snapshot.docs.map((item) => item.data() as CloudUserProfile);
}

export async function saveCloudProfile(profile: CloudUserProfile): Promise<void> {
	const db = getCardMasterFirestore();
	await setDoc(doc(db, FIRESTORE_COLLECTIONS.profiles, profile.id), profile);
}
```

- [ ] **Step 3: Update profile context value to async methods**

In `client/src/features/profile/profile-context.tsx`, change context method types:

```ts
createProfile: (input: CreateProfileInput) => Promise<UserProfile>;
switchProfile: (profileId: string) => Promise<void>;
updateCurrentProfile: (updates: {
	nickname?: string;
	avatarEmoji?: string;
	primaryColor?: string | null;
	hanziFont?: HanziFontPreference;
	sidebarBackground?: SidebarBackgroundPreference;
	dailyGoal?: number;
	reviewPerDay?: number;
	newPerDay?: number;
}) => Promise<void>;
```

- [ ] **Step 4: Load cloud profiles from auth user**

In `profile-context.tsx`, import:

```ts
import { useEffect } from "react";
import { useAuth } from "@/features/auth/auth-context";
import {
	getOrCreateAccountRecord,
	listCloudProfiles,
	saveCloudProfile,
	updateAccountCurrentProfile,
	type AccountRecord,
	type CloudUserProfile,
} from "./profile-repository";
```

Add state:

```ts
const { user, accountUserId } = useAuth();
const [ready, setReady] = useState(false);
const [accountRecord, setAccountRecord] = useState<AccountRecord | null>(null);
```

Replace localStorage initial state with:

```ts
const [state, setState] = useState<StoredProfileState>({
	profiles: [],
	current_profile_id: null,
});
```

Add effect:

```ts
useEffect(() => {
	let cancelled = false;

	async function loadProfiles() {
		if (!user || !accountUserId) {
			setState({ profiles: [], current_profile_id: null });
			setAccountRecord(null);
			setReady(true);
			return;
		}

		setReady(false);
		const now = nowIso();
		const account = await getOrCreateAccountRecord({
			uid: accountUserId,
			email: user.email,
			displayName: user.displayName,
			photoUrl: user.photoURL,
			now,
		});
		const profiles = await listCloudProfiles(accountUserId);
		if (cancelled) return;
		setAccountRecord(account);
		setState({
			profiles,
			current_profile_id: account.current_profile_id,
		});
		setReady(true);
	}

	void loadProfiles();

	return () => {
		cancelled = true;
	};
}, [accountUserId, user]);
```

- [ ] **Step 5: Persist profile changes to Firestore**

Inside `createProfile`, after building `profile`, build:

```ts
const cloudProfile: CloudUserProfile = {
	...profile,
	account_user_id: accountUserId,
};
await saveCloudProfile(cloudProfile);
await updateAccountCurrentProfile(accountUserId, profile.id, now);
```

Guard at the top:

```ts
if (!accountUserId) throw new Error("Cannot create a profile while signed out.");
```

Update `switchProfile` to call:

```ts
await saveCloudProfile({ ...updatedProfile, account_user_id: accountUserId });
await updateAccountCurrentProfile(accountUserId, profileId, now);
```

Update `updateCurrentProfile` to save the changed profile with `account_user_id`.

- [ ] **Step 6: Update create profile call sites**

In `client/src/components/app-shell.tsx`, change:

```ts
createProfile(input);
setCreateProfileOpen(false);
```

to:

```ts
void createProfile(input).then(() => {
	setCreateProfileOpen(false);
	if (isFirstProfile) {
		navigate("/quick-start");
	}
});
```

Remove the old immediate navigate call from that block to avoid double navigation.

- [ ] **Step 7: Build**

Run:

```bash
cd client && npm run build
```

Expected: build passes.

- [ ] **Step 8: Commit**

```bash
git add client/src/features/profile/profile-context.tsx client/src/features/profile/profile-repository.ts client/src/features/profile/local-profile-store.ts client/src/components/app-shell.tsx
git commit -m "feat: sync profiles to firestore"
```

## Task 6: Add Account/Profile Parameters to Entity APIs

**Files:**

- Modify: `client/src/lib/api/card-pack.ts`
- Modify: `client/src/lib/api/card.ts`
- Modify: `client/src/lib/api/review-event.ts`
- Modify: `client/src/lib/api/scheduling-profile.ts`
- Modify: `client/src/lib/api/scheduling-state.ts`
- Modify: `client/src/lib/api/card-mastery-state.ts`
- Modify: `client/src/lib/api/dtos/review-event.ts`
- Modify: `client/src/lib/api/dtos/card-pack.ts`
- Modify: `client/src/lib/api/dtos/card.ts`
- Modify: `client/src/lib/api/dtos/card-mastery-state.ts`
- Modify: `client/src/lib/api/dtos/card-scheduling-state.ts`
- Modify: `client/src/lib/api/dtos/scheduling-profile.ts`

- [ ] **Step 1: Update DTOs with cloud fields**

For insert DTOs that currently omit only local generated fields, allow `account_user_id` and `profile_id` where needed. Example for `client/src/lib/api/dtos/card.ts`:

```ts
import type { Card } from "../entities/card";

export type CardInsert = Omit<Card, "id" | "created_at" | "updated_at"> & {
	updated_at?: string | null;
};

export type CardUpdate = Partial<
	Omit<
		Card,
		| "id"
		| "owner_user_id"
		| "account_user_id"
		| "profile_id"
		| "created_at"
	>
>;
```

Apply the same rule to pack, mastery state, scheduling state, scheduling profile, and review event DTOs.

- [ ] **Step 2: Update card pack API signatures**

Change `client/src/lib/api/card-pack.ts` exported signatures to:

```ts
export async function listCardPacks(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
): Promise<CardPack[]>
```

Use filter:

```ts
filter: (pack) =>
	pack.account_user_id === accountUserId && pack.profile_id === profileId,
```

In `createCardPack`, build ownership:

```ts
const ownership = createCloudOwnership(accountUserId, profileId);
```

and record:

```ts
const record: CardPack = {
	id: generateId(),
	name: payload.name,
	type: payload.type ?? DEFAULT_CARD_PACK_TYPE,
	owner_user_id: ownership.owner_user_id,
	account_user_id: ownership.account_user_id,
	profile_id: ownership.profile_id,
	status: payload.status ?? DEFAULT_CARD_PACK.status,
	created_at: now,
	updated_at: payload.updated_at ?? null,
};
```

Update get/update/delete functions to require both ids and verify both fields.

- [ ] **Step 3: Update card API signatures**

Change `client/src/lib/api/card.ts` exported signatures to accept `accountUserId` and `profileId`. In create records, set:

```ts
const ownership = createCloudOwnership(accountUserId, profileId);
```

and include:

```ts
owner_user_id: ownership.owner_user_id,
account_user_id: ownership.account_user_id,
profile_id: ownership.profile_id,
```

Filters must check both `account_user_id` and `profile_id` before `cardPackId` and `status`.

- [ ] **Step 4: Update scheduling and mastery APIs**

Change list/update helpers to accept `accountUserId` and `profileId`. Filters must check:

```ts
state.account_user_id === accountUserId &&
state.learner_profile_id === profileId
```

For insert helpers, accept inserts that already contain ownership and preserve:

```ts
account_user_id: input.account_user_id,
learner_profile_id: input.learner_profile_id,
profile_id: input.profile_id,
owner_user_id: input.owner_user_id,
```

- [ ] **Step 5: Update review event API**

`createReviewEvent` should require payload with `account_user_id`, `profile_id`, and `owner_user_id`. The created record should spread payload and add generated id/created_at:

```ts
const record: ReviewEvent = {
	...payload,
	id: generateId(),
	created_at: nowIso(),
};
```

- [ ] **Step 6: Run TypeScript**

Run:

```bash
cd client && npm run build
```

Expected: TypeScript fails at call sites that still pass only `ownerUserId`. Keep the failure output as the call-site list for Task 7.

- [ ] **Step 7: Commit only if build passes**

If Task 7 is not being executed immediately, do not commit a broken build. If Task 7 is next in the same execution block, commit after Task 7.

## Task 7: Update App Call Sites to Pass Account and Profile Identity

**Files:**

- Modify: `client/src/features/home/hooks/use-home-page.ts`
- Modify: `client/src/pages/pack-cards-page.tsx`
- Modify: `client/src/features/review/hooks/use-review-session.ts`
- Modify: `client/src/features/review/hooks/use-global-review-session.ts`
- Modify: `client/src/features/review/hooks/use-quick-review.ts`
- Modify: `client/src/pages/global-review-page.tsx`
- Modify: `client/src/pages/pack-review-page.tsx`
- Modify: `client/src/components/app-shell.tsx`

- [ ] **Step 1: Use auth context in home hook**

In `client/src/features/home/hooks/use-home-page.ts`, import:

```ts
import { useAuth } from "@/features/auth/auth-context";
```

Add:

```ts
const { accountUserId } = useAuth();
const profileId = currentProfile?.id ?? null;
```

Replace `ownerUserId` checks with:

```ts
if (!accountUserId || !profileId) return;
```

Call APIs as:

```ts
listCardPacksWithCounts(apiClient, accountUserId, profileId)
createCardPack(apiClient, accountUserId, profileId, { name, type })
updateCardPack(apiClient, targetPack.id, accountUserId, profileId, { name })
deleteCardPack(apiClient, pack.id, accountUserId, profileId)
```

- [ ] **Step 2: Use auth context in pack cards page**

In `client/src/pages/pack-cards-page.tsx`, import `useAuth` and add:

```ts
const { accountUserId } = useAuth();
const profileId = currentProfile?.id ?? null;
```

Replace null guards with:

```ts
if (!accountUserId || !profileId) return;
```

Call APIs with both ids:

```ts
listCards(apiClient, accountUserId, profileId, { cardPackId })
createCard(apiClient, accountUserId, profileId, input)
updateCard(apiClient, cardId, accountUserId, profileId, updates)
deleteCard(apiClient, cardId, accountUserId, profileId)
```

- [ ] **Step 3: Update review hooks**

In each review hook, import `useAuth`, derive:

```ts
const { accountUserId } = useAuth();
const profileId = currentProfile?.id ?? null;
```

Use both ids for card, pack, scheduling, mastery, and review event calls.

When creating scheduling state insert payloads, include:

```ts
owner_user_id: profileId,
account_user_id: accountUserId,
learner_profile_id: profileId,
profile_id: schedulingProfile.id,
```

For card-level profile ownership, use `profileId` from `currentProfile.id`. For scheduling algorithm profile id, keep `schedulingProfile.id` in the `profile_id` field already required by `CardSchedulingState`. Use `learner_profile_id` for cloud learner-profile scoping on scheduling state.

- [ ] **Step 4: Verify scheduling state naming**

Because `CardSchedulingState` already has `profile_id` for the scheduling profile, verify that entity has this shape:

```ts
export type CardSchedulingState = {
	id: string;
	owner_user_id: string;
	account_user_id?: string;
	learner_profile_id?: string;
	card_id: string;
	profile_id: string;
	due_at: string;
	state: Record<string, unknown>;
	last_reviewed_at: string | null;
	last_event_id: string | null;
	created_at: string;
};
```

For Firestore ownership checks on scheduling states, use `learner_profile_id`. Other entities continue using `profile_id`.

- [ ] **Step 5: Build**

Run:

```bash
cd client && npm run build
```

Expected: build passes.

- [ ] **Step 6: Test**

Run:

```bash
cd client && npm run test -- --run
```

Expected: tests pass or fail only where fixtures need ownership fields. Fix fixture records by adding:

```ts
account_user_id: "account-1",
profile_id: "profile-1",
owner_user_id: "profile-1",
```

For scheduling state fixtures, use:

```ts
account_user_id: "account-1",
learner_profile_id: "profile-1",
owner_user_id: "profile-1",
```

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/api client/src/features/home/hooks/use-home-page.ts client/src/pages/pack-cards-page.tsx client/src/features/review/hooks client/src/pages/global-review-page.tsx client/src/pages/pack-review-page.tsx client/src/components/app-shell.tsx
git commit -m "feat: scope api calls by account and profile"
```

## Task 8: Replace Broad Firestore Reads with Entity-Specific Queries

**Files:**

- Modify: `client/src/lib/api/firestore-client.ts`
- Modify: `client/src/lib/api/card-pack.ts`
- Modify: `client/src/lib/api/card.ts`
- Modify: `client/src/lib/api/scheduling-profile.ts`
- Modify: `client/src/lib/api/scheduling-state.ts`
- Modify: `client/src/lib/api/card-mastery-state.ts`
- Modify: `client/src/lib/api/review-event.ts`

- [ ] **Step 1: Add constrained list helper**

In `client/src/lib/api/firestore-client.ts`, export:

```ts
export async function listFirestoreRecords<S extends StoreName>(
	store: S,
	constraints: QueryConstraint[],
): Promise<StoreValue<S>[]> {
	const db = getCardMasterFirestore();
	const snapshot = await getDocs(
		query(collection(db, STORE_TO_COLLECTION[store]), ...constraints),
	);
	return snapshot.docs.map((item) =>
		normalizeSnapshotValue(store, item.id, item.data()),
	);
}
```

- [ ] **Step 2: Use constrained query in card packs**

In `card-pack.ts`, import:

```ts
import { orderBy } from "firebase/firestore";
import { listFirestoreRecords, ownershipConstraints } from "./firestore-client";
```

Replace `client.list("card_pack"...` in `listCardPacks` with:

```ts
return listFirestoreRecords("card_pack", [
	...ownershipConstraints(accountUserId, profileId),
	orderBy("created_at", "asc"),
]);
```

For `listCardPacksWithCounts`, query cards with ownership constraints too, then count in memory.

- [ ] **Step 3: Use constrained query in cards**

In `card.ts`, import `where`, `orderBy`, `listFirestoreRecords`, and `ownershipConstraints`. Replace list with:

```ts
const constraints = [
	...ownershipConstraints(accountUserId, profileId),
	orderBy("created_at", "asc"),
];
if (filters.cardPackId) {
	constraints.splice(2, 0, where("card_pack_id", "==", filters.cardPackId));
}
if (filters.status) {
	constraints.splice(2, 0, where("status", "==", filters.status));
}
return listFirestoreRecords("card", constraints);
```

- [ ] **Step 4: Use constrained query in state APIs**

For scheduling and mastery states, use `where("card_id", "in", chunk)` with chunks of 10 ids because Firestore `in` queries are limited. Add helper:

```ts
function chunkIds(ids: string[]): string[][] {
	const chunks: string[][] = [];
	for (let index = 0; index < ids.length; index += 10) {
		chunks.push(ids.slice(index, index + 10));
	}
	return chunks;
}
```

For mastery states, query each chunk with `ownershipConstraints(accountUserId, profileId)` and merge results.

For scheduling states, do not use `ownershipConstraints` because scheduling state uses `learner_profile_id` for learner scoping and keeps `profile_id` for the scheduling algorithm profile. Query each chunk with:

```ts
[
	where("account_user_id", "==", accountUserId),
	where("learner_profile_id", "==", profileId),
	where("card_id", "in", chunk),
]
```

Merge all chunk results after the reads complete.

- [ ] **Step 5: Build and test**

Run:

```bash
cd client && npm run build
cd client && npm run test -- --run
```

Expected: build and tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/api
git commit -m "refactor: query firestore by ownership"
```

## Task 9: Add Manual Local Data Import

**Files:**

- Create: `client/src/features/import/local-data-import.ts`
- Create: `client/src/features/import/local-data-import.test.ts`
- Create: `client/src/features/import/local-data-import-dialog.tsx`
- Modify: `client/src/components/app-shell.tsx`
- Modify: `client/src/pages/preferences-page.tsx`
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/zh-CN.json`

- [ ] **Step 1: Write import id mapping test**

Create `client/src/features/import/local-data-import.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createImportPlan } from "./local-data-import";

describe("createImportPlan", () => {
	it("maps local profile, pack, and card ids to cloud ids with ownership", () => {
		const plan = createImportPlan({
			accountUserId: "account-1",
			now: "2026-05-24T00:00:00.000Z",
			localProfiles: [
				{
					id: "local-profile",
					nickname: "Local",
					avatar_emoji: "字",
					primary_color: null,
					hanzi_font: "kaiti",
					sidebar_background: "nav-illustration",
					daily_goal: 20,
					review_per_day: 20,
					new_per_day: 10,
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: null,
					last_used_at: "2026-01-01T00:00:00.000Z",
				},
			],
			cardPacks: [
				{
					id: "pack-1",
					name: "Pack",
					type: "pinyin-hanzi",
					owner_user_id: "local-profile",
					status: "active",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: null,
				},
			],
			cards: [
				{
					id: "card-1",
					card_pack_id: "pack-1",
					owner_user_id: "local-profile",
					prompt: "ni3",
					answer: "你",
					status: "active",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: null,
				},
			],
			reviewEvents: [],
			schedulingProfiles: [],
			schedulingStates: [],
			masteryStates: [],
		});

		expect(plan.profiles).toHaveLength(1);
		expect(plan.cardPacks[0].account_user_id).toBe("account-1");
		expect(plan.cardPacks[0].owner_user_id).toBe(plan.profiles[0].id);
		expect(plan.cards[0].card_pack_id).toBe(plan.cardPacks[0].id);
		expect(plan.cards[0].account_user_id).toBe("account-1");
	});
});
```

- [ ] **Step 2: Implement import planner**

Create `client/src/features/import/local-data-import.ts`:

```ts
import type { UserProfile } from "@/features/profile/profile-context";
import type { Card } from "@/lib/api/entities/card";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import { generateId } from "@/lib/api/utils";

export type LocalImportSource = {
	accountUserId: string;
	now: string;
	localProfiles: UserProfile[];
	cardPacks: CardPack[];
	cards: Card[];
	reviewEvents: ReviewEvent[];
	schedulingProfiles: SchedulingProfile[];
	schedulingStates: CardSchedulingState[];
	masteryStates: CardMasteryState[];
};

export type LocalImportPlan = {
	profiles: (UserProfile & { account_user_id: string })[];
	cardPacks: CardPack[];
	cards: Card[];
	reviewEvents: ReviewEvent[];
	schedulingProfiles: SchedulingProfile[];
	schedulingStates: CardSchedulingState[];
	masteryStates: CardMasteryState[];
};

export function createImportPlan(source: LocalImportSource): LocalImportPlan {
	const profileIdMap = new Map<string, string>();
	const packIdMap = new Map<string, string>();
	const cardIdMap = new Map<string, string>();
	const schedulingProfileIdMap = new Map<string, string>();
	const importBatchId = generateId();

	const profiles = source.localProfiles.map((profile) => {
		const nextId = generateId();
		profileIdMap.set(profile.id, nextId);
		return {
			...profile,
			id: nextId,
			account_user_id: source.accountUserId,
			created_at: source.now,
			updated_at: source.now,
			last_used_at: source.now,
		};
	});

	const cardPacks = source.cardPacks.flatMap((pack) => {
		const profileId = profileIdMap.get(pack.owner_user_id);
		if (!profileId) return [];
		const nextId = generateId();
		packIdMap.set(pack.id, nextId);
		return [{
			...pack,
			id: nextId,
			owner_user_id: profileId,
			account_user_id: source.accountUserId,
			profile_id: profileId,
			created_at: source.now,
			updated_at: source.now,
			import_source_id: pack.id,
			import_batch_id: importBatchId,
		} as CardPack];
	});

	const cards = source.cards.flatMap((card) => {
		const profileId = profileIdMap.get(card.owner_user_id);
		const packId = packIdMap.get(card.card_pack_id);
		if (!profileId || !packId) return [];
		const nextId = generateId();
		cardIdMap.set(card.id, nextId);
		return [{
			...card,
			id: nextId,
			card_pack_id: packId,
			owner_user_id: profileId,
			account_user_id: source.accountUserId,
			profile_id: profileId,
			created_at: source.now,
			updated_at: source.now,
			import_source_id: card.id,
			import_batch_id: importBatchId,
		} as Card];
	});

	const schedulingProfiles = source.schedulingProfiles.flatMap((profile) => {
		const ownerProfileId = profileIdMap.get(profile.owner_user_id);
		if (!ownerProfileId) return [];
		const nextId = generateId();
		schedulingProfileIdMap.set(profile.id, nextId);
		return [{
			...profile,
			id: nextId,
			owner_user_id: ownerProfileId,
			account_user_id: source.accountUserId,
			profile_id: ownerProfileId,
			created_at: source.now,
		} as SchedulingProfile];
	});

	const reviewEvents = source.reviewEvents.flatMap((event) => {
		const profileId = profileIdMap.get(event.owner_user_id);
		const cardId = cardIdMap.get(event.card_id);
		if (!profileId || !cardId) return [];
		return [{
			...event,
			id: generateId(),
			card_id: cardId,
			owner_user_id: profileId,
			account_user_id: source.accountUserId,
			profile_id: profileId,
			created_at: source.now,
		} as ReviewEvent];
	});

	const schedulingStates = source.schedulingStates.flatMap((state) => {
		const profileId = profileIdMap.get(state.owner_user_id);
		const cardId = cardIdMap.get(state.card_id);
		const schedulingProfileId = schedulingProfileIdMap.get(state.profile_id);
		if (!profileId || !cardId || !schedulingProfileId) return [];
		return [{
			...state,
			id: generateId(),
			card_id: cardId,
			profile_id: schedulingProfileId,
			owner_user_id: profileId,
			account_user_id: source.accountUserId,
			learner_profile_id: profileId,
			created_at: source.now,
		} as CardSchedulingState];
	});

	const masteryStates = source.masteryStates.flatMap((state) => {
		const profileId = profileIdMap.get(state.owner_user_id);
		const cardId = cardIdMap.get(state.card_id);
		if (!profileId || !cardId) return [];
		return [{
			...state,
			id: generateId(),
			card_id: cardId,
			owner_user_id: profileId,
			account_user_id: source.accountUserId,
			profile_id: profileId,
			created_at: source.now,
			updated_at: source.now,
		} as CardMasteryState];
	});

	return {
		profiles,
		cardPacks,
		cards,
		reviewEvents,
		schedulingProfiles,
		schedulingStates,
		masteryStates,
	};
}
```

- [ ] **Step 3: Run the new test and verify failure or pass**

Run:

```bash
cd client && npm run test -- --run src/features/import/local-data-import.test.ts
```

Expected: pass after Step 2.

- [ ] **Step 4: Add import dialog UI**

Create `client/src/features/import/local-data-import-dialog.tsx` with a dialog that accepts counts and an `onImport` callback:

```tsx
import { DownloadCloud } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type ImportCounts = {
	profiles: number;
	cardPacks: number;
	cards: number;
	reviewEvents: number;
	states: number;
};

type LocalDataImportDialogProps = {
	open: boolean;
	counts: ImportCounts | null;
	onOpenChange: (open: boolean) => void;
	onImport: () => Promise<void>;
};

export function LocalDataImportDialog({
	open,
	counts,
	onOpenChange,
	onImport,
}: LocalDataImportDialogProps) {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleImport() {
		setLoading(true);
		setError(null);
		try {
			await onImport();
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("import.local.failed"));
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("import.local.title")}</DialogTitle>
					<DialogDescription>{t("import.local.description")}</DialogDescription>
				</DialogHeader>
				{counts ? (
					<div className="grid gap-2 text-sm">
						<p>{t("import.local.profiles", { count: counts.profiles })}</p>
						<p>{t("import.local.packs", { count: counts.cardPacks })}</p>
						<p>{t("import.local.cards", { count: counts.cards })}</p>
						<p>{t("import.local.events", { count: counts.reviewEvents })}</p>
						<p>{t("import.local.states", { count: counts.states })}</p>
					</div>
				) : null}
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleImport} disabled={loading || !counts}>
						<DownloadCloud className="size-4" />
						{t("import.local.action")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 5: Wire dialog entry in AppShell and Preferences**

Add an import menu item in `AppShell` and an import button in `PreferencesPage`. Both should set `localImportOpen` to true and render `LocalDataImportDialog`.

Use a small adapter function in `AppShell` first:

```ts
async function handleLocalImport() {
	if (!accountUserId) return;
	// Load legacy IndexedDB/localStorage source, create plan, write Firestore records.
	// Keep this body in local-data-import.ts once read/write helpers are added.
}
```

Before committing, move the body into `local-data-import.ts` so UI files do not contain storage migration logic.

- [ ] **Step 6: Add i18n strings**

Add to both locale files:

```json
"import": {
	"local": {
		"title": "Import local data",
		"description": "Create new cloud profiles from data saved in this browser.",
		"action": "Import",
		"failed": "Import failed. Try again.",
		"profiles": "{{count}} profiles",
		"packs": "{{count}} packs",
		"cards": "{{count}} cards",
		"events": "{{count}} review events",
		"states": "{{count}} state records"
	}
}
```

For Chinese, translate the string values and preserve keys.

- [ ] **Step 7: Build and test**

Run:

```bash
cd client && npm run build
cd client && npm run test -- --run
```

Expected: build and tests pass.

- [ ] **Step 8: Commit**

```bash
git add client/src/features/import client/src/components/app-shell.tsx client/src/pages/preferences-page.tsx client/src/i18n/locales/en.json client/src/i18n/locales/zh-CN.json
git commit -m "feat: import local data to cloud"
```

## Task 10: Add Firestore Rules, Indexes, and Firebase Config

**Files:**

- Create: `client/firestore.rules`
- Create: `client/firestore.indexes.json`
- Create: `client/firebase.json`
- Modify: `client/README.md`

- [ ] **Step 1: Create Firestore rules**

Create `client/firestore.rules`:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function ownsExisting() {
      return signedIn() && resource.data.account_user_id == request.auth.uid;
    }

    function ownsIncoming() {
      return signedIn() && request.resource.data.account_user_id == request.auth.uid;
    }

    function keepsOwner() {
      return ownsExisting() && ownsIncoming();
    }

    match /users/{userId} {
      allow read: if signedIn() && userId == request.auth.uid;
      allow create: if signedIn() && userId == request.auth.uid;
      allow update, delete: if signedIn() && userId == request.auth.uid;
    }

    match /profiles/{profileId} {
      allow read: if ownsExisting();
      allow create: if ownsIncoming();
      allow update, delete: if keepsOwner();
    }

    match /card_packs/{documentId} {
      allow read: if ownsExisting();
      allow create: if ownsIncoming();
      allow update, delete: if keepsOwner();
    }

    match /cards/{documentId} {
      allow read: if ownsExisting();
      allow create: if ownsIncoming();
      allow update, delete: if keepsOwner();
    }

    match /scheduling_profiles/{documentId} {
      allow read: if ownsExisting();
      allow create: if ownsIncoming();
      allow update, delete: if keepsOwner();
    }

    match /card_scheduling_states/{documentId} {
      allow read: if ownsExisting();
      allow create: if ownsIncoming();
      allow update, delete: if keepsOwner();
    }

    match /card_mastery_states/{documentId} {
      allow read: if ownsExisting();
      allow create: if ownsIncoming();
      allow update, delete: if keepsOwner();
    }

    match /review_events/{documentId} {
      allow read: if ownsExisting();
      allow create: if ownsIncoming();
      allow update, delete: if keepsOwner();
    }
  }
}
```

- [ ] **Step 2: Create indexes**

Create `client/firestore.indexes.json`:

```json
{
	"indexes": [
		{
			"collectionGroup": "profiles",
			"queryScope": "COLLECTION",
			"fields": [
				{ "fieldPath": "account_user_id", "order": "ASCENDING" },
				{ "fieldPath": "last_used_at", "order": "DESCENDING" }
			]
		},
		{
			"collectionGroup": "card_packs",
			"queryScope": "COLLECTION",
			"fields": [
				{ "fieldPath": "account_user_id", "order": "ASCENDING" },
				{ "fieldPath": "profile_id", "order": "ASCENDING" },
				{ "fieldPath": "created_at", "order": "ASCENDING" }
			]
		},
		{
			"collectionGroup": "cards",
			"queryScope": "COLLECTION",
			"fields": [
				{ "fieldPath": "account_user_id", "order": "ASCENDING" },
				{ "fieldPath": "profile_id", "order": "ASCENDING" },
				{ "fieldPath": "card_pack_id", "order": "ASCENDING" },
				{ "fieldPath": "created_at", "order": "ASCENDING" }
			]
		},
		{
			"collectionGroup": "review_events",
			"queryScope": "COLLECTION",
			"fields": [
				{ "fieldPath": "account_user_id", "order": "ASCENDING" },
				{ "fieldPath": "profile_id", "order": "ASCENDING" },
				{ "fieldPath": "card_id", "order": "ASCENDING" },
				{ "fieldPath": "reviewed_at", "order": "ASCENDING" }
			]
		},
		{
			"collectionGroup": "card_scheduling_states",
			"queryScope": "COLLECTION",
			"fields": [
				{ "fieldPath": "account_user_id", "order": "ASCENDING" },
				{ "fieldPath": "learner_profile_id", "order": "ASCENDING" },
				{ "fieldPath": "card_id", "order": "ASCENDING" }
			]
		},
		{
			"collectionGroup": "card_mastery_states",
			"queryScope": "COLLECTION",
			"fields": [
				{ "fieldPath": "account_user_id", "order": "ASCENDING" },
				{ "fieldPath": "profile_id", "order": "ASCENDING" },
				{ "fieldPath": "card_id", "order": "ASCENDING" }
			]
		}
	],
	"fieldOverrides": []
}
```

- [ ] **Step 3: Create Firebase config**

Create `client/firebase.json`:

```json
{
	"firestore": {
		"rules": "firestore.rules",
		"indexes": "firestore.indexes.json"
	}
}
```

- [ ] **Step 4: Document env vars**

Append to `client/README.md`:

```md
## Firebase Configuration

The app uses Firebase Authentication and Cloud Firestore when running the main application. Configure these Vite variables in local `.env.local` and in GitLab CI/CD variables:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase Web config is public browser configuration. Do not add service account JSON, private keys, or Firebase Admin credentials to the frontend.

Google sign-in requires the GitLab Pages domain, local development host, and any custom production domain to be listed in Firebase Authentication authorized domains.
```

- [ ] **Step 5: Build**

Run:

```bash
cd client && npm run build
```

Expected: build passes.

- [ ] **Step 6: Commit**

```bash
git add client/firestore.rules client/firestore.indexes.json client/firebase.json client/README.md
git commit -m "chore: add firestore deployment config"
```

## Task 11: End-to-End Manual QA and Release Readiness

**Files:**

- Modify only files required to fix issues found during QA.

- [ ] **Step 1: Run full automated checks**

Run:

```bash
cd client && npm run lint
cd client && npm run test -- --run
cd client && npm run build
```

Expected: all commands pass.

- [ ] **Step 2: Start local dev server**

Run:

```bash
cd client && npm run dev
```

Expected: Vite prints a localhost URL.

- [ ] **Step 3: Verify unauthenticated gate**

Open the Vite URL in the browser.

Expected:

- Login page appears.
- Sidebar is not visible.
- Navigating to `#/`, `#/review`, or `#/preferences` still shows login while signed out.

- [ ] **Step 4: Verify Google login and profile creation**

Click Google login.

Expected:

- Google account chooser opens.
- After successful login, the app creates or loads `users/{uid}`.
- If the account has no profiles, create-profile dialog opens.
- Creating a profile enters the app and navigates to Quick Start for the first profile.

- [ ] **Step 5: Verify profile isolation**

Create Profile A and Profile B.

Expected:

- A pack created under Profile A is not visible under Profile B.
- Switching back to Profile A restores that pack.
- Preferences changed under Profile A do not change Profile B.

- [ ] **Step 6: Verify core workflows write cloud data**

Under Profile A:

- Create a pinyin-hanzi pack.
- Create at least two cards.
- Run pack review.
- Run global review.

Expected in Firestore console:

- `card_packs`, `cards`, `review_events`, `card_scheduling_states`, and `card_mastery_states` have `account_user_id` equal to the Firebase uid.
- User-facing app state reloads after browser refresh.

- [ ] **Step 7: Verify local import**

Use a browser with existing local IndexedDB data.

Expected:

- Import entry is visible after login.
- Preview counts match the local data.
- Import creates new cloud profiles by default.
- Imported packs/cards appear after switching to the imported profile.

- [ ] **Step 8: Verify sign out**

Sign out from the user menu.

Expected:

- App returns to login page.
- Refresh stays on login page.
- Signing back in restores the last selected cloud profile.

- [ ] **Step 9: Verify Firestore rules**

In browser DevTools or a small local script, attempt to write a document with:

```ts
account_user_id: "not-the-current-user"
```

Expected: Firestore rejects the write with a permission error.

- [ ] **Step 10: Final commit for fixes**

If QA required fixes, commit them:

```bash
git add client
git commit -m "fix: stabilize firebase cloud sync"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Notes

- Spec coverage: authentication, multi-profile account model, Firestore storage, explicit local import, rules, indexes, GitLab Pages env config, and QA are covered by Tasks 1-11.
- No implementation task intentionally introduces a custom backend.
- The overloaded scheduling `profile_id` conflict is handled explicitly by introducing `learner_profile_id` for cloud ownership on scheduling state before call sites are migrated.
- The plan keeps IndexedDB only for legacy import after Task 3.
- The plan requires broad reads to be replaced by ownership-constrained Firestore queries in Task 8.
