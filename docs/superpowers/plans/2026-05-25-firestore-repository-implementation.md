# Firestore Repository Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move main cloud data access to Firestore-native repositories with batched writes, precise queries, and scoped in-memory caching.

**Architecture:** Add focused Firestore helper modules, then domain repositories for dashboard, cards, packs, review, profiles, scheduling, and import/export. Migrate active UI hooks to repositories while leaving the old `ApiClient` and IndexedDB code only for deprecated local-data import and compatibility tests.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Firebase Firestore web SDK, Tailwind/shadcn-style UI.

---

## File Structure

Create:

- `client/src/lib/data/firestore/firestore-store.ts`  
  Collection mapping, Firestore instance access, sanitization, document refs, query helpers, snapshot normalization.
- `client/src/lib/data/firestore/batch-writer.ts`  
  Batched set/delete writer with 450 operation chunks and cache invalidation hooks.
- `client/src/lib/data/firestore/query-cache.ts`  
  Profile-scoped memory cache with TTL and invalidation.
- `client/src/lib/data/firestore/ownership.ts`  
  Query constraint builders and ownership guards.
- `client/src/lib/data/firestore/id-chunks.ts`  
  Firestore `in` query chunk helper, moved from the legacy client.
- `client/src/lib/data/firestore/batch-writer.test.ts`
- `client/src/lib/data/firestore/query-cache.test.ts`
- `client/src/lib/data/repositories/dashboard-repository.ts`
- `client/src/lib/data/repositories/card-repository.ts`
- `client/src/lib/data/repositories/card-pack-repository.ts`
- `client/src/lib/data/repositories/scheduling-repository.ts`
- `client/src/lib/data/repositories/review-repository.ts`
- `client/src/lib/data/repositories/profile-repository.ts`
- `client/src/lib/data/repositories/import-export-repository.ts`
- `client/src/lib/data/repositories/local-import-repository.ts`
- `client/src/lib/data/repositories/repository-test-utils.ts`
- `client/src/lib/data/repositories/*.test.ts`
- `client/scripts/check-firestore-single-record-writes.mjs`

Modify:

- `client/src/lib/api/firestore-client.ts`  
  Re-export `chunkFirestoreInValues` from the new helper and mark the module legacy.
- `client/src/lib/api/client.ts`  
  Mark `ApiClient` and `createApiClient()` deprecated for main cloud workflows.
- `client/src/lib/api/import-export.ts`  
  Either convert to a thin compatibility wrapper around the new repository or leave with a deprecation note after consumers move.
- `client/src/features/home/hooks/use-home-page.ts`
- `client/src/pages/pack-cards-page.tsx`
- `client/src/features/review/hooks/persist-review-result.ts`
- `client/src/features/review/hooks/use-review-session.ts`
- `client/src/features/review/hooks/use-global-review-session.ts`
- `client/src/features/profile/profile-repository.ts`  
  Either replace with a wrapper around `lib/data/repositories/profile-repository.ts` or migrate imports and deprecate the old file.
- `client/src/features/profile/profile-context.tsx`
- `client/src/features/import/local-data-import.ts`
- `client/package.json`

Do not remove IndexedDB files in this implementation.

---

### Task 1: Firestore Cache and Chunk Helpers

**Files:**

- Create: `client/src/lib/data/firestore/query-cache.ts`
- Create: `client/src/lib/data/firestore/query-cache.test.ts`
- Create: `client/src/lib/data/firestore/id-chunks.ts`
- Modify: `client/src/lib/api/firestore-client.ts`

- [ ] **Step 1: Write failing tests for cache and id chunks**

Create `client/src/lib/data/firestore/query-cache.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
	clearQueryCache,
	createProfileCacheKey,
	getCachedQuery,
	setCachedQuery,
} from "./query-cache";
import { chunkFirestoreInValues } from "./id-chunks";

describe("query-cache", () => {
	it("stores values by profile-scoped cache key until ttl expires", () => {
		vi.useFakeTimers();
		clearQueryCache();
		const key = createProfileCacheKey("account-1", "profile-1", "dashboard");

		setCachedQuery(key, { packs: 1 }, 1000);
		expect(getCachedQuery<{ packs: number }>(key)).toEqual({ packs: 1 });

		vi.advanceTimersByTime(1001);
		expect(getCachedQuery(key)).toBeNull();
		vi.useRealTimers();
	});

	it("clears one profile scope without clearing another profile", () => {
		clearQueryCache();
		const first = createProfileCacheKey("account-1", "profile-1", "cards");
		const second = createProfileCacheKey("account-1", "profile-2", "cards");

		setCachedQuery(first, ["a"], 1000);
		setCachedQuery(second, ["b"], 1000);
		clearQueryCache({ accountUserId: "account-1", profileId: "profile-1" });

		expect(getCachedQuery(first)).toBeNull();
		expect(getCachedQuery<string[]>(second)).toEqual(["b"]);
	});
});

describe("chunkFirestoreInValues", () => {
	it("deduplicates ids, removes empty values, and chunks by 10", () => {
		const values = Array.from({ length: 23 }, (_, index) => `card-${index}`);

		const chunks = chunkFirestoreInValues([...values, "card-1", ""]);

		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toHaveLength(10);
		expect(chunks[1]).toHaveLength(10);
		expect(chunks[2]).toEqual(["card-20", "card-21", "card-22"]);
		expect(chunks.flat()).toEqual(values);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd client && npm test -- --run src/lib/data/firestore/query-cache.test.ts
```

Expected: FAIL because `query-cache.ts` and `id-chunks.ts` do not exist.

- [ ] **Step 3: Implement cache helper**

Create `client/src/lib/data/firestore/query-cache.ts`:

```ts
export type ProfileScope = {
	accountUserId: string;
	profileId: string;
};

type CacheRecord = {
	expiresAt: number;
	value: unknown;
};

const cache = new Map<string, CacheRecord>();

export function createProfileCacheKey(
	accountUserId: string,
	profileId: string,
	resource: string,
	qualifier = "all",
): string {
	return `${accountUserId}:${profileId}:${resource}:${qualifier}`;
}

export function getCachedQuery<T>(key: string): T | null {
	const cached = cache.get(key);
	if (!cached) return null;
	if (cached.expiresAt <= Date.now()) {
		cache.delete(key);
		return null;
	}
	return cached.value as T;
}

export function setCachedQuery<T>(key: string, value: T, ttlMs: number): void {
	cache.set(key, {
		expiresAt: Date.now() + ttlMs,
		value,
	});
}

export function clearQueryCache(scope?: ProfileScope): void {
	if (!scope) {
		cache.clear();
		return;
	}

	const prefix = `${scope.accountUserId}:${scope.profileId}:`;
	for (const key of cache.keys()) {
		if (key.startsWith(prefix)) {
			cache.delete(key);
		}
	}
}
```

- [ ] **Step 4: Implement id chunk helper**

Create `client/src/lib/data/firestore/id-chunks.ts`:

```ts
export const FIRESTORE_IN_FILTER_LIMIT = 10;

export function chunkFirestoreInValues(values: string[]): string[][] {
	const uniqueValues = Array.from(new Set(values)).filter(
		(value) => value.length > 0,
	);
	const chunks: string[][] = [];
	for (
		let index = 0;
		index < uniqueValues.length;
		index += FIRESTORE_IN_FILTER_LIMIT
	) {
		chunks.push(uniqueValues.slice(index, index + FIRESTORE_IN_FILTER_LIMIT));
	}
	return chunks;
}
```

- [ ] **Step 5: Keep legacy import compatibility**

Modify `client/src/lib/api/firestore-client.ts` by replacing the local constant/function with imports and exports:

```ts
import {
	FIRESTORE_IN_FILTER_LIMIT,
	chunkFirestoreInValues,
} from "@/lib/data/firestore/id-chunks";

export { FIRESTORE_IN_FILTER_LIMIT, chunkFirestoreInValues };
```

Remove the old local `FIRESTORE_IN_FILTER_LIMIT` and `chunkFirestoreInValues` definitions from the same file.

- [ ] **Step 6: Run focused tests**

Run:

```bash
cd client && npm test -- --run src/lib/data/firestore/query-cache.test.ts src/lib/api/firestore-client.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/data/firestore/query-cache.ts client/src/lib/data/firestore/query-cache.test.ts client/src/lib/data/firestore/id-chunks.ts client/src/lib/api/firestore-client.ts
git commit -m "feat: add firestore cache and id chunk helpers"
```

---

### Task 2: Firestore Store and Batch Writer

**Files:**

- Create: `client/src/lib/data/firestore/firestore-store.ts`
- Create: `client/src/lib/data/firestore/batch-writer.ts`
- Create: `client/src/lib/data/firestore/batch-writer.test.ts`

- [ ] **Step 1: Write failing batch writer tests**

Create `client/src/lib/data/firestore/batch-writer.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { commitBatchedWrites, type BatchOperation } from "./batch-writer";

function createBatchFactory() {
	const commits: BatchOperation[][] = [];
	const currentBatches: BatchOperation[][] = [];
	return {
		commits,
		createBatch: () => {
			const operations: BatchOperation[] = [];
			currentBatches.push(operations);
			return {
				set: vi.fn((ref: unknown, value: unknown) => {
					operations.push({ type: "set", ref, value });
				}),
				delete: vi.fn((ref: unknown) => {
					operations.push({ type: "delete", ref });
				}),
				commit: vi.fn(async () => {
					commits.push([...operations]);
				}),
			};
		},
	};
}

describe("commitBatchedWrites", () => {
	it("does not create a batch for zero operations", async () => {
		const factory = createBatchFactory();

		const result = await commitBatchedWrites([], { createBatch: factory.createBatch });

		expect(result).toEqual({ batchCount: 0, operationCount: 0 });
		expect(factory.commits).toEqual([]);
	});

	it("commits 450 operations as one batch", async () => {
		const factory = createBatchFactory();
		const operations = Array.from({ length: 450 }, (_, index) => ({
			type: "delete" as const,
			ref: `doc-${index}`,
		}));

		const result = await commitBatchedWrites(operations, {
			createBatch: factory.createBatch,
		});

		expect(result).toEqual({ batchCount: 1, operationCount: 450 });
		expect(factory.commits).toHaveLength(1);
		expect(factory.commits[0]).toHaveLength(450);
	});

	it("commits 901 operations as three batches", async () => {
		const factory = createBatchFactory();
		const operations = Array.from({ length: 901 }, (_, index) => ({
			type: "set" as const,
			ref: `doc-${index}`,
			value: { id: `doc-${index}` },
		}));

		const result = await commitBatchedWrites(operations, {
			createBatch: factory.createBatch,
		});

		expect(result).toEqual({ batchCount: 3, operationCount: 901 });
		expect(factory.commits.map((batch) => batch.length)).toEqual([450, 450, 1]);
	});

	it("invalidates cache after successful commits", async () => {
		const factory = createBatchFactory();
		const invalidate = vi.fn();

		await commitBatchedWrites(
			[{ type: "delete", ref: "doc-1" }],
			{ createBatch: factory.createBatch, invalidate },
		);

		expect(invalidate).toHaveBeenCalledTimes(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd client && npm test -- --run src/lib/data/firestore/batch-writer.test.ts
```

Expected: FAIL because `batch-writer.ts` does not exist.

- [ ] **Step 3: Implement Firestore store helper**

Create `client/src/lib/data/firestore/firestore-store.ts`:

```ts
import {
	collection,
	doc,
	getDocs,
	query,
	type DocumentData,
	type Firestore,
	type QueryConstraint,
	type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { StoreName, StoreValue } from "@/lib/api/client";
import { FIRESTORE_COLLECTIONS, getCardMasterFirestore } from "@/lib/firebase/firestore";

const STORE_TO_COLLECTION: Record<StoreName, string> = {
	card_pack: FIRESTORE_COLLECTIONS.cardPacks,
	card: FIRESTORE_COLLECTIONS.cards,
	card_mastery_state: FIRESTORE_COLLECTIONS.cardMasteryStates,
	card_scheduling_state: FIRESTORE_COLLECTIONS.cardSchedulingStates,
	scheduling_profile: FIRESTORE_COLLECTIONS.schedulingProfiles,
	review_event: FIRESTORE_COLLECTIONS.reviewEvents,
};

let firestoreInstance: Firestore | null = null;

export function getFirestoreDb(): Firestore {
	firestoreInstance ??= getCardMasterFirestore();
	return firestoreInstance;
}

export function collectionNameForStore(store: StoreName): string {
	return STORE_TO_COLLECTION[store];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === "[object Object]";
}

export function sanitizeFirestoreValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) =>
			item === undefined ? null : sanitizeFirestoreValue(item),
		);
	}
	if (!isPlainRecord(value)) return value;
	const sanitized: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		if (item !== undefined) sanitized[key] = sanitizeFirestoreValue(item);
	}
	return sanitized;
}

export function sanitizeFirestoreDocument(record: DocumentData): DocumentData {
	return sanitizeFirestoreValue(record) as DocumentData;
}

export function normalizeSnapshotValue<S extends StoreName>(
	snapshot: QueryDocumentSnapshot<DocumentData>,
): StoreValue<S> {
	const data = snapshot.data();
	return {
		...data,
		id: typeof data.id === "string" && data.id.length > 0 ? data.id : snapshot.id,
	} as StoreValue<S>;
}

export function storeDocRef(store: StoreName, id: string) {
	return doc(getFirestoreDb(), collectionNameForStore(store), id);
}

export async function queryStoreRecords<S extends StoreName>(
	store: S,
	constraints: QueryConstraint[],
): Promise<StoreValue<S>[]> {
	const collectionRef = collection(getFirestoreDb(), collectionNameForStore(store));
	const snapshot = await getDocs(query(collectionRef, ...constraints));
	return snapshot.docs.map((documentSnapshot) =>
		normalizeSnapshotValue<S>(documentSnapshot),
	);
}
```

- [ ] **Step 4: Implement batch writer**

Create `client/src/lib/data/firestore/batch-writer.ts`:

```ts
import { writeBatch } from "firebase/firestore";
import { getFirestoreDb, sanitizeFirestoreDocument } from "./firestore-store";

export const FIRESTORE_BATCH_WRITE_LIMIT = 450;

export type BatchOperation =
	| { type: "set"; ref: unknown; value: unknown }
	| { type: "delete"; ref: unknown };

type BatchLike = {
	set(ref: unknown, value: unknown): void;
	delete(ref: unknown): void;
	commit(): Promise<void>;
};

type CommitBatchedWritesOptions = {
	createBatch?: () => BatchLike;
	invalidate?: () => void;
};

export type BatchCommitResult = {
	batchCount: number;
	operationCount: number;
};

export async function commitBatchedWrites(
	operations: BatchOperation[],
	options: CommitBatchedWritesOptions = {},
): Promise<BatchCommitResult> {
	if (operations.length === 0) {
		return { batchCount: 0, operationCount: 0 };
	}

	const createBatch =
		options.createBatch ??
		(() => writeBatch(getFirestoreDb()) as unknown as BatchLike);
	let batchCount = 0;

	for (let index = 0; index < operations.length; index += FIRESTORE_BATCH_WRITE_LIMIT) {
		const batch = createBatch();
		const chunk = operations.slice(index, index + FIRESTORE_BATCH_WRITE_LIMIT);
		for (const operation of chunk) {
			if (operation.type === "set") {
				batch.set(operation.ref, sanitizeFirestoreDocument(operation.value as never));
			} else {
				batch.delete(operation.ref);
			}
		}
		await batch.commit();
		batchCount += 1;
	}

	options.invalidate?.();
	return { batchCount, operationCount: operations.length };
}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd client && npm test -- --run src/lib/data/firestore/batch-writer.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/data/firestore/firestore-store.ts client/src/lib/data/firestore/batch-writer.ts client/src/lib/data/firestore/batch-writer.test.ts
git commit -m "feat: add firestore batch writer"
```

---

### Task 3: Ownership Helpers and Repository Test Utilities

**Files:**

- Create: `client/src/lib/data/firestore/ownership.ts`
- Create: `client/src/lib/data/repositories/repository-test-utils.ts`
- Create: `client/src/lib/data/firestore/ownership.test.ts`

- [ ] **Step 1: Write failing ownership tests**

Create `client/src/lib/data/firestore/ownership.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	hasLearnerOwnership,
	hasProfileOwnership,
	profileScope,
} from "./ownership";

describe("ownership helpers", () => {
	it("matches strict profile ownership", () => {
		expect(
			hasProfileOwnership(
				{
					account_user_id: "account-1",
					profile_id: "profile-1",
					owner_user_id: "profile-1",
				},
				"profile-1",
			),
		).toBe(true);
	});

	it("rejects cross-profile records", () => {
		expect(
			hasProfileOwnership(
				{
					account_user_id: "account-1",
					profile_id: "profile-2",
					owner_user_id: "profile-2",
				},
				"profile-1",
			),
		).toBe(false);
	});

	it("builds stable profile scope objects", () => {
		expect(profileScope("account-1", "profile-1")).toEqual({
			accountUserId: "account-1",
			profileId: "profile-1",
		});
	});

	it("matches learner ownership for scheduling state records", () => {
		expect(
			hasLearnerOwnership(
				{
					account_user_id: "account-1",
					learner_profile_id: "profile-1",
					owner_user_id: "profile-1",
				},
				"profile-1",
			),
		).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd client && npm test -- --run src/lib/data/firestore/ownership.test.ts
```

Expected: FAIL because `ownership.ts` does not exist.

- [ ] **Step 3: Implement ownership helpers**

Create `client/src/lib/data/firestore/ownership.ts`:

```ts
import { where, type QueryConstraint } from "firebase/firestore";

export type FirestoreProfileScope = {
	accountUserId: string;
	profileId: string;
};

export function profileScope(
	accountUserId: string,
	profileId: string,
): FirestoreProfileScope {
	return { accountUserId, profileId };
}

export function profileOwnershipConstraints(
	accountUserId: string,
	profileId: string,
): QueryConstraint[] {
	return [
		where("account_user_id", "==", accountUserId),
		where("profile_id", "==", profileId),
	];
}

export function learnerOwnershipConstraints(
	accountUserId: string,
	profileId: string,
): QueryConstraint[] {
	return [
		where("account_user_id", "==", accountUserId),
		where("learner_profile_id", "==", profileId),
	];
}

export function hasProfileOwnership(
	record: {
		account_user_id?: string;
		profile_id?: string;
		owner_user_id?: string;
	},
	profileId: string,
): boolean {
	return record.profile_id === profileId && record.owner_user_id === profileId;
}

export function hasLearnerOwnership(
	record: {
		account_user_id?: string;
		learner_profile_id?: string;
		owner_user_id?: string;
	},
	profileId: string,
): boolean {
	return (
		record.learner_profile_id === profileId && record.owner_user_id === profileId
	);
}
```

- [ ] **Step 4: Create repository test utilities**

Create `client/src/lib/data/repositories/repository-test-utils.ts`:

```ts
import type { StoreName, StoreValue } from "@/lib/api/client";

export type RepositoryTestDb = {
	[S in StoreName]: StoreValue<S>[];
};

export function createRepositoryTestDb(
	initial?: Partial<RepositoryTestDb>,
): RepositoryTestDb {
	return {
		card_pack: [],
		card: [],
		card_mastery_state: [],
		card_scheduling_state: [],
		scheduling_profile: [],
		review_event: [],
		...initial,
	};
}

export function upsertRecord<S extends StoreName>(
	db: RepositoryTestDb,
	store: S,
	record: StoreValue<S>,
): void {
	const records = db[store] as StoreValue<S>[];
	const index = records.findIndex((item) => item.id === record.id);
	if (index >= 0) {
		records[index] = record;
	} else {
		records.push(record);
	}
}

export function deleteRecord<S extends StoreName>(
	db: RepositoryTestDb,
	store: S,
	id: string,
): void {
	const records = db[store] as StoreValue<S>[];
	const index = records.findIndex((item) => item.id === id);
	if (index >= 0) records.splice(index, 1);
}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd client && npm test -- --run src/lib/data/firestore/ownership.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/data/firestore/ownership.ts client/src/lib/data/firestore/ownership.test.ts client/src/lib/data/repositories/repository-test-utils.ts
git commit -m "feat: add firestore ownership helpers"
```

---

### Task 4: Dashboard, Scheduling, Card, and Pack Repositories

**Files:**

- Create: `client/src/lib/data/repositories/scheduling-repository.ts`
- Create: `client/src/lib/data/repositories/dashboard-repository.ts`
- Create: `client/src/lib/data/repositories/card-repository.ts`
- Create: `client/src/lib/data/repositories/card-pack-repository.ts`
- Create: `client/src/lib/data/repositories/dashboard-repository.test.ts`
- Create: `client/src/lib/data/repositories/card-repository.test.ts`
- Create: `client/src/lib/data/repositories/card-pack-repository.test.ts`

- [ ] **Step 1: Write dashboard repository failing test**

Create `client/src/lib/data/repositories/dashboard-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import { createRepositoryTestDb } from "./repository-test-utils";
import { createDashboardRepository } from "./dashboard-repository";

const now = new Date("2026-05-25T10:00:00.000Z");

describe("dashboard repository", () => {
	it("returns pack counts and due count for one profile", async () => {
		const pack: CardPack = {
			id: "pack-1",
			name: "Pack",
			type: "basic",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			status: "active",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: null,
		};
		const dueCard: Card = {
			id: "card-1",
			card_pack_id: "pack-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			prompt: "q1",
			answer: "a1",
			status: "active",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: null,
		};
		const futureCard: Card = { ...dueCard, id: "card-2", prompt: "q2" };
		const futureState: CardSchedulingState = {
			id: "state-1",
			account_user_id: "account-1",
			learner_profile_id: "profile-1",
			owner_user_id: "profile-1",
			card_id: "card-2",
			profile_id: "schedule-profile-1",
			due_at: "2026-05-26T10:00:00.000Z",
			state: {},
			last_reviewed_at: null,
			last_event_id: null,
			created_at: "2026-01-01T00:00:00.000Z",
		};
		const db = createRepositoryTestDb({
			card_pack: [pack],
			card: [dueCard, futureCard],
			card_scheduling_state: [futureState],
		});

		const repository = createDashboardRepository({ db, now: () => now });

		await expect(
			repository.loadHomeDashboard("account-1", "profile-1"),
		).resolves.toEqual({
			packs: [{ ...pack, cards_count: 2 }],
			dueCardsCount: 1,
		});
	});
});
```

- [ ] **Step 2: Write card bulk create failing test**

Create `client/src/lib/data/repositories/card-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRepositoryTestDb } from "./repository-test-utils";
import { createCardRepository } from "./card-repository";

describe("card repository", () => {
	it("bulk creates cards with cloud ownership", async () => {
		const db = createRepositoryTestDb();
		const repository = createCardRepository({
			db,
			generateId: (() => {
				let index = 0;
				return () => `card-${(index += 1)}`;
			})(),
			now: () => "2026-05-25T00:00:00.000Z",
		});

		const cards = await repository.bulkCreateCards({
			accountUserId: "account-1",
			profileId: "profile-1",
			cardPackId: "pack-1",
			cards: [
				{ prompt: "q1", answer: "a1" },
				{ prompt: "q2", answer: "a2" },
			],
		});

		expect(cards.map((card) => card.id)).toEqual(["card-1", "card-2"]);
		expect(db.card).toHaveLength(2);
		expect(db.card[0]).toMatchObject({
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			card_pack_id: "pack-1",
		});
	});
});
```

- [ ] **Step 3: Write pack cascade delete failing test**

Create `client/src/lib/data/repositories/card-pack-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import { createRepositoryTestDb } from "./repository-test-utils";
import { createCardPackRepository } from "./card-pack-repository";

describe("card pack repository", () => {
	it("deletes a pack and all card-owned review data", async () => {
		const pack: CardPack = {
			id: "pack-1",
			name: "Pack",
			type: "basic",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			status: "active",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: null,
		};
		const card: Card = {
			id: "card-1",
			card_pack_id: "pack-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			prompt: "q",
			answer: "a",
			status: "active",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: null,
		};
		const scheduling: CardSchedulingState = {
			id: "schedule-1",
			account_user_id: "account-1",
			learner_profile_id: "profile-1",
			owner_user_id: "profile-1",
			card_id: "card-1",
			profile_id: "schedule-profile-1",
			due_at: "2026-01-02T00:00:00.000Z",
			state: {},
			last_reviewed_at: null,
			last_event_id: null,
			created_at: "2026-01-01T00:00:00.000Z",
		};
		const mastery: CardMasteryState = {
			id: "mastery-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			card_id: "card-1",
			mastery_score: 50,
			mastery_state: "learning",
			easy_streak: 0,
			recent_outcomes: [],
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const event: ReviewEvent = {
			id: "event-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			card_id: "card-1",
			grade: 3,
			reviewed_at: "2026-01-01T00:00:00.000Z",
			duration_ms: null,
		};
		const db = createRepositoryTestDb({
			card_pack: [pack],
			card: [card],
			card_scheduling_state: [scheduling],
			card_mastery_state: [mastery],
			review_event: [event],
		});
		const repository = createCardPackRepository({ db });

		await repository.deletePackWithData("account-1", "profile-1", "pack-1");

		expect(db.card_pack).toEqual([]);
		expect(db.card).toEqual([]);
		expect(db.card_scheduling_state).toEqual([]);
		expect(db.card_mastery_state).toEqual([]);
		expect(db.review_event).toEqual([]);
	});
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
cd client && npm test -- --run src/lib/data/repositories/dashboard-repository.test.ts src/lib/data/repositories/card-repository.test.ts src/lib/data/repositories/card-pack-repository.test.ts
```

Expected: FAIL because repositories do not exist.

- [ ] **Step 5: Implement repositories with test injection**

Implement each repository with a factory that accepts either Firestore defaults or a test `db`. Use this pattern:

```ts
type RepositoryDeps = {
	db?: RepositoryTestDb;
	now?: () => Date | string;
	generateId?: () => string;
};
```

For test `db`, read/write arrays directly through `repository-test-utils.ts`. For production, use `queryStoreRecords`, `storeDocRef`, and `commitBatchedWrites`.

`card-repository.ts` must export:

```ts
export type BulkCreateCardInput = {
	accountUserId: string;
	profileId: string;
	cardPackId: string;
	cards: Array<{
		prompt: string;
		answer: string;
		question_content?: Card["question_content"];
		answer_content?: Card["answer_content"];
	}>;
};

export function createCardRepository(deps: RepositoryDeps = {}) {
	return {
		loadPackCards,
		createCard,
		updateCard,
		deleteCard,
		bulkCreateCards,
	};
}
```

`card-pack-repository.ts` must export:

```ts
export function createCardPackRepository(deps: RepositoryDeps = {}) {
	return {
		listCardPacks,
		createCardPack,
		updateCardPack,
		deletePackWithData,
	};
}
```

`dashboard-repository.ts` must export:

```ts
export function createDashboardRepository(deps: RepositoryDeps = {}) {
	return { loadHomeDashboard };
}
```

`scheduling-repository.ts` must export:

```ts
export function createSchedulingRepository(deps: RepositoryDeps = {}) {
	return {
		fetchSchedulingProfile,
		getOrCreateSchedulingProfile,
		listSchedulingStatesByCardIds,
	};
}
```

- [ ] **Step 6: Run repository tests**

Run:

```bash
cd client && npm test -- --run src/lib/data/repositories/dashboard-repository.test.ts src/lib/data/repositories/card-repository.test.ts src/lib/data/repositories/card-pack-repository.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/data/repositories/scheduling-repository.ts client/src/lib/data/repositories/dashboard-repository.ts client/src/lib/data/repositories/card-repository.ts client/src/lib/data/repositories/card-pack-repository.ts client/src/lib/data/repositories/dashboard-repository.test.ts client/src/lib/data/repositories/card-repository.test.ts client/src/lib/data/repositories/card-pack-repository.test.ts
git commit -m "feat: add card and dashboard repositories"
```

---

### Task 5: Review Repository

**Files:**

- Create: `client/src/lib/data/repositories/review-repository.ts`
- Create: `client/src/lib/data/repositories/review-repository.test.ts`
- Modify: `client/src/features/review/hooks/persist-review-result.ts`

- [ ] **Step 1: Write failing review repository test**

Create `client/src/lib/data/repositories/review-repository.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import { createRepositoryTestDb } from "./repository-test-utils";
import { createReviewRepository } from "./review-repository";

describe("review repository", () => {
	it("persists event, scheduling state, and mastery state", async () => {
		const db = createRepositoryTestDb();
		const notify = vi.fn();
		const repository = createReviewRepository({
			db,
			notifyDailyProgress: notify,
			generateId: () => "mastery-1",
		});
		const event: ReviewEvent = {
			id: "event-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			card_id: "card-1",
			grade: 3,
			reviewed_at: "2026-05-25T00:00:00.000Z",
			duration_ms: null,
		};
		const schedulingState: CardSchedulingState = {
			id: "schedule-1",
			account_user_id: "account-1",
			learner_profile_id: "profile-1",
			owner_user_id: "profile-1",
			card_id: "card-1",
			profile_id: "schedule-profile-1",
			due_at: "2026-05-26T00:00:00.000Z",
			state: {},
			last_reviewed_at: "2026-05-25T00:00:00.000Z",
			last_event_id: null,
			created_at: "2026-05-25T00:00:00.000Z",
		};

		await repository.persistReviewResult({
			accountUserId: "account-1",
			profileId: "profile-1",
			grade: "good",
			reviewEvent: event,
			schedulingState,
			existingSchedulingState: null,
			nextDueAt: new Date("2026-05-26T00:00:00.000Z"),
		});

		expect(db.review_event).toHaveLength(1);
		expect(db.card_scheduling_state[0]).toMatchObject({
			id: "schedule-1",
			last_event_id: "event-1",
		});
		expect(db.card_mastery_state[0]).toMatchObject({
			id: "mastery-1",
			card_id: "card-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
		});
		expect(notify).toHaveBeenCalledWith({
			accountUserId: "account-1",
			profileId: "profile-1",
			completedDelta: 1,
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd client && npm test -- --run src/lib/data/repositories/review-repository.test.ts
```

Expected: FAIL because `review-repository.ts` does not exist.

- [ ] **Step 3: Implement review repository**

Create `client/src/lib/data/repositories/review-repository.ts` with:

```ts
import { computeMasteryUpdate } from "@/features/mastery";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import type { ReviewGrade, Sm2State } from "@/lib/scheduling/types";
import { generateId } from "@/lib/api/utils";
import { notifyDailyReviewProgressUpdated } from "@/features/review/daily-goal";

export type PersistReviewRepositoryInput = {
	accountUserId: string;
	profileId: string;
	grade: ReviewGrade;
	reviewEvent: ReviewEvent;
	schedulingState: CardSchedulingState;
	existingSchedulingState: CardSchedulingState | null;
	nextDueAt: Date;
};

type ReviewRepositoryDeps = {
	db?: RepositoryTestDb;
	generateId?: () => string;
	notifyDailyProgress?: typeof notifyDailyReviewProgressUpdated;
};

export function createReviewRepository(deps: ReviewRepositoryDeps = {}) {
	const createId = deps.generateId ?? generateId;
	const notifyDailyProgress =
		deps.notifyDailyProgress ?? notifyDailyReviewProgressUpdated;

	async function persistReviewResult(input: PersistReviewRepositoryInput) {
		const existingMastery = await findMasteryByCardId(
			input.accountUserId,
			input.profileId,
			input.reviewEvent.card_id,
		);
		const masteryUpdate = computeMasteryUpdate({
			existing: existingMastery,
			ownerUserId: input.profileId,
			accountUserId: input.accountUserId,
			profileId: input.profileId,
			cardId: input.reviewEvent.card_id,
			grade: input.grade,
			now: new Date(input.reviewEvent.reviewed_at),
			previousDueAt: input.existingSchedulingState
				? new Date(input.existingSchedulingState.due_at)
				: null,
			nextDueAt: input.nextDueAt,
			previousSm2State:
				(input.existingSchedulingState?.state as Sm2State | null) ?? null,
			nextSm2State: input.schedulingState.state as Sm2State,
		});
		const masteryRecord: CardMasteryState = existingMastery
			? { ...existingMastery, ...masteryUpdate.nextMastery }
			: { ...masteryUpdate.nextMastery, id: createId() };
		const schedulingRecord: CardSchedulingState = {
			...input.schedulingState,
			last_event_id: input.reviewEvent.id,
		};

		await writeReviewRecords(input.reviewEvent, schedulingRecord, masteryRecord);

		if (input.grade !== "again") {
			notifyDailyProgress({
				accountUserId: input.accountUserId,
				profileId: input.profileId,
				completedDelta: 1,
			});
		}

		return {
			masteryFeedback: {
				cardId: input.reviewEvent.card_id,
				transition: masteryUpdate.transition,
				rating: input.grade,
				isFirstLearn: masteryUpdate.isFirstLearn,
			},
		};
	}

	return { persistReviewResult };
}
```

Complete the helper functions in the same file:

- `findMasteryByCardId(...)` reads from injected `db` in tests or Firestore in production.
- `writeReviewRecords(...)` upserts injected `db` records in tests or uses one `commitBatchedWrites` call in production.

- [ ] **Step 4: Convert current hook helper to wrapper**

Modify `client/src/features/review/hooks/persist-review-result.ts` so `persistReviewResult` calls `createReviewRepository().persistReviewResult(...)` and keeps the existing external hook signature. Remove direct calls to `createReviewEvent`, `upsertSchedulingState`, `getMasteryStateByCardId`, and `upsertMasteryState`.

- [ ] **Step 5: Run tests**

Run:

```bash
cd client && npm test -- --run src/lib/data/repositories/review-repository.test.ts src/lib/review/review-session.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/data/repositories/review-repository.ts client/src/lib/data/repositories/review-repository.test.ts client/src/features/review/hooks/persist-review-result.ts
git commit -m "feat: add review persistence repository"
```

---

### Task 6: Profile Repository Migration

**Files:**

- Create: `client/src/lib/data/repositories/profile-repository.ts`
- Create: `client/src/lib/data/repositories/profile-repository.test.ts`
- Modify: `client/src/features/profile/profile-repository.ts`
- Modify: `client/src/features/profile/profile-context.tsx`

- [ ] **Step 1: Write failing profile delete test**

Create `client/src/lib/data/repositories/profile-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import { createRepositoryTestDb } from "./repository-test-utils";
import { createProfileRepository } from "./profile-repository";

describe("profile repository", () => {
	it("deletes all profile-owned data and learner scheduling data", async () => {
		const pack: CardPack = {
			id: "pack-1",
			name: "Pack",
			type: "basic",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			status: "active",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: null,
		};
		const card: Card = {
			id: "card-1",
			card_pack_id: "pack-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			prompt: "q",
			answer: "a",
			status: "active",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: null,
		};
		const db = createRepositoryTestDb({ card_pack: [pack], card: [card] });
		const repository = createProfileRepository({
			db,
			profiles: [{ id: "profile-1", account_user_id: "account-1" }],
			account: { id: "account-1", current_profile_id: "profile-1" },
		});

		await repository.deleteProfileWithData(
			"account-1",
			"profile-1",
			null,
			"2026-05-25T00:00:00.000Z",
		);

		expect(db.card_pack).toEqual([]);
		expect(db.card).toEqual([]);
		expect(repository.getTestProfiles()).toEqual([]);
		expect(repository.getTestAccount().current_profile_id).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd client && npm test -- --run src/lib/data/repositories/profile-repository.test.ts
```

Expected: FAIL because `profile-repository.ts` does not exist.

- [ ] **Step 3: Implement profile repository**

Create `client/src/lib/data/repositories/profile-repository.ts` and move the public cloud profile functions into it:

```ts
export function createProfileRepository(deps: ProfileRepositoryDeps = {}) {
	return {
		getOrCreateAccountRecord,
		updateAccountCurrentProfile,
		listCloudProfiles,
		saveCloudProfile,
		saveCloudProfileAndSetCurrentProfile,
		touchCloudProfileAndSetCurrentProfile,
		deleteProfileWithData,
		getTestProfiles,
		getTestAccount,
	};
}
```

Production `deleteProfileWithData` must:

- Query profile-owned stores with `profileOwnershipConstraints(accountUserId, profileId)`.
- Query scheduling state with `learnerOwnershipConstraints(accountUserId, profileId)`.
- Convert all matching docs to delete operations.
- Delete `profiles/{profileId}`.
- Set `users/{accountUserId}.current_profile_id` to `nextCurrentProfileId`.
- Clear profile cache.

- [ ] **Step 4: Replace old feature repository with wrapper exports**

Modify `client/src/features/profile/profile-repository.ts`:

```ts
import { createProfileRepository } from "@/lib/data/repositories/profile-repository";

const repository = createProfileRepository();

export type { AccountRecord, CloudUserProfile } from "@/lib/data/repositories/profile-repository";

export const getOrCreateAccountRecord = repository.getOrCreateAccountRecord;
export const updateAccountCurrentProfile = repository.updateAccountCurrentProfile;
export const deleteCloudProfileWithData = repository.deleteProfileWithData;
export const listCloudProfiles = repository.listCloudProfiles;
export const saveCloudProfile = repository.saveCloudProfile;
export const saveCloudProfileAndSetCurrentProfile =
	repository.saveCloudProfileAndSetCurrentProfile;
export const touchCloudProfileAndSetCurrentProfile =
	repository.touchCloudProfileAndSetCurrentProfile;
```

Keep this wrapper temporarily so `profile-context.tsx` has a smaller diff.

- [ ] **Step 5: Run profile tests**

Run:

```bash
cd client && npm test -- --run src/lib/data/repositories/profile-repository.test.ts src/features/import/local-data-import.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/data/repositories/profile-repository.ts client/src/lib/data/repositories/profile-repository.test.ts client/src/features/profile/profile-repository.ts client/src/features/profile/profile-context.tsx
git commit -m "feat: move profile data access to repository"
```

---

### Task 7: Import/Export and Local Import Repositories

**Files:**

- Create: `client/src/lib/data/repositories/import-export-repository.ts`
- Create: `client/src/lib/data/repositories/import-export-repository.test.ts`
- Create: `client/src/lib/data/repositories/local-import-repository.ts`
- Modify: `client/src/lib/api/import-export.ts`
- Modify: `client/src/features/import/local-data-import.ts`
- Modify: `client/src/features/home/hooks/use-home-page.ts`

- [ ] **Step 1: Write failing import repository test**

Create `client/src/lib/data/repositories/import-export-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRepositoryTestDb } from "./repository-test-utils";
import { createImportExportRepository } from "./import-export-repository";

describe("import/export repository", () => {
	it("imports packs and cards with mapped ids and cloud ownership", async () => {
		const db = createRepositoryTestDb();
		const repository = createImportExportRepository({
			db,
			generateId: (() => {
				const ids = ["pack-new", "card-new"];
				let index = 0;
				return () => ids[index++];
			})(),
		});

		const result = await repository.importCardMasterData(
			"account-1",
			"profile-1",
			{
				format: "card-master-export",
				version: 1,
				exported_at: "2026-05-25T00:00:00.000Z",
				include_review_state: false,
				packs: [
					{
						id: "pack-old",
						name: "Pack",
						type: "basic",
						account_user_id: "old-account",
						profile_id: "old-profile",
						owner_user_id: "old-profile",
						status: "active",
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: null,
					},
				],
				cards: [
					{
						id: "card-old",
						card_pack_id: "pack-old",
						account_user_id: "old-account",
						profile_id: "old-profile",
						owner_user_id: "old-profile",
						prompt: "q",
						answer: "a",
						status: "active",
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: null,
					},
				],
			},
			{ importReviewState: false },
		);

		expect(result).toMatchObject({ cardPacks: 1, cards: 1 });
		expect(db.card_pack[0]).toMatchObject({
			id: "pack-new",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
		});
		expect(db.card[0]).toMatchObject({
			id: "card-new",
			card_pack_id: "pack-new",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd client && npm test -- --run src/lib/data/repositories/import-export-repository.test.ts
```

Expected: FAIL because repository does not exist.

- [ ] **Step 3: Implement import/export repository**

Create `client/src/lib/data/repositories/import-export-repository.ts` by moving logic from `client/src/lib/api/import-export.ts` and replacing serial `client.put` calls with batched store writes. Export:

```ts
export function createImportExportRepository(deps: ImportExportRepositoryDeps = {}) {
	return {
		buildCardMasterExport,
		importCardMasterData,
		parseCardMasterExport,
		downloadCardMasterExport,
	};
}
```

Production import must build arrays for each store, then call one batch writer operation list:

```ts
const operations: BatchOperation[] = [
	...packs.map((pack) => ({ type: "set" as const, ref: storeDocRef("card_pack", pack.id), value: pack })),
	...cards.map((card) => ({ type: "set" as const, ref: storeDocRef("card", card.id), value: card })),
	...reviewEvents.map((event) => ({ type: "set" as const, ref: storeDocRef("review_event", event.id), value: event })),
];
await commitBatchedWrites(operations, {
	invalidate: () => clearQueryCache({ accountUserId, profileId }),
});
```

- [ ] **Step 4: Add local import repository wrapper**

Create `client/src/lib/data/repositories/local-import-repository.ts`:

```ts
import type { LocalDataImportPlan, LocalDataImportSummary } from "@/features/import/local-data-import";
import { createImportExportRepository } from "./import-export-repository";
import { createProfileRepository } from "./profile-repository";

export async function writeLocalImportPlanToFirestore(
	plan: LocalDataImportPlan,
): Promise<LocalDataImportSummary> {
	const profileRepository = createProfileRepository();
	const importRepository = createImportExportRepository();
	await profileRepository.saveManyCloudProfiles(plan.profiles);
	await importRepository.writePlannedRecords({
		accountUserId: plan.accountUserId,
		profileId: plan.currentProfileId,
		cardPacks: plan.cardPacks,
		cards: plan.cards,
		schedulingProfiles: plan.schedulingProfiles,
		reviewEvents: plan.reviewEvents,
		schedulingStates: plan.schedulingStates,
		cardMasteryStates: plan.cardMasteryStates,
	});
	return {
		...plan.counts,
		status: "imported",
		sourceFingerprint: plan.sourceFingerprint,
		completedAt: new Date().toISOString(),
	};
}
```

If `LocalDataImportPlan` does not expose `currentProfileId`, use the profile ids already present in planned records and do not add a new field.

- [ ] **Step 5: Convert compatibility wrapper**

Modify `client/src/lib/api/import-export.ts` to re-export from `createImportExportRepository()` for existing consumers until all imports are updated.

- [ ] **Step 6: Update home import/export calls**

Modify `client/src/features/home/hooks/use-home-page.ts` to use:

```ts
const importExportRepository = useMemo(() => createImportExportRepository(), []);
```

Then replace direct imports from `@/lib/api/import-export` with repository calls.

- [ ] **Step 7: Run import tests**

Run:

```bash
cd client && npm test -- --run src/lib/data/repositories/import-export-repository.test.ts src/lib/api/import-export.test.ts src/features/import/local-data-import.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add client/src/lib/data/repositories/import-export-repository.ts client/src/lib/data/repositories/import-export-repository.test.ts client/src/lib/data/repositories/local-import-repository.ts client/src/lib/api/import-export.ts client/src/features/import/local-data-import.ts client/src/features/home/hooks/use-home-page.ts
git commit -m "feat: batch firestore import export writes"
```

---

### Task 8: Migrate Main UI Hooks to Repositories

**Files:**

- Modify: `client/src/features/home/hooks/use-home-page.ts`
- Modify: `client/src/pages/pack-cards-page.tsx`
- Modify: `client/src/features/review/hooks/use-review-session.ts`
- Modify: `client/src/features/review/hooks/use-global-review-session.ts`
- Modify: `client/src/features/review/hooks/use-quick-review.ts`

- [ ] **Step 1: Remove `createApiClient()` from home hook**

Modify `client/src/features/home/hooks/use-home-page.ts`:

```ts
const dashboardRepository = useMemo(() => createDashboardRepository(), []);
const cardPackRepository = useMemo(() => createCardPackRepository(), []);
const importExportRepository = useMemo(() => createImportExportRepository(), []);
```

Replace:

```ts
listCardPacks(apiClient, accountUserId, profileId)
listCards(apiClient, accountUserId, profileId)
deleteCardPack(apiClient, accountUserId, profileId, pack.id)
```

with:

```ts
dashboardRepository.loadHomeDashboard(accountUserId, profileId)
cardPackRepository.deletePackWithData(accountUserId, profileId, pack.id)
```

- [ ] **Step 2: Remove `createApiClient()` from pack cards page**

Modify `client/src/pages/pack-cards-page.tsx` to create `cardRepository` and use:

```ts
const { pack, cards } = await cardRepository.loadPackCards(
	accountUserId,
	profileId,
	cardPackId,
);
```

Replace bulk create `Promise.all(accepted.map(createCard))` with:

```ts
const createdCards = await cardRepository.bulkCreateCards({
	accountUserId,
	profileId,
	cardPackId,
	cards: accepted.map((value) => ({
		prompt: value.questionText.trim(),
		answer: value.answerText.trim(),
		question_content: { text: value.questionText.trim() },
		answer_content: { text: value.answerText.trim() },
	})),
});
```

- [ ] **Step 3: Remove `createApiClient()` from review session hooks**

Modify `use-review-session.ts`, `use-global-review-session.ts`, and `use-quick-review.ts` to use:

```ts
const cardRepository = useMemo(() => createCardRepository(), []);
const cardPackRepository = useMemo(() => createCardPackRepository(), []);
const schedulingRepository = useMemo(() => createSchedulingRepository(), []);
```

Replace `getOrCreateSchedulingProfile`, `listCards`, `listCardPacks`, and `listSchedulingStatesByCardIds` calls with repository methods.

- [ ] **Step 4: Run build to catch integration errors**

Run:

```bash
cd client && npm run build
```

Expected: PASS.

- [ ] **Step 5: Search for remaining main workflow API usage**

Run:

```bash
rg -n "createApiClient\\(|client\\.put\\(|client\\.delete\\(|Promise\\.all\\(.*createCard" client/src
```

Expected: remaining matches are only legacy API modules, tests, or explicitly deprecated local import compatibility code.

- [ ] **Step 6: Commit**

```bash
git add client/src/features/home/hooks/use-home-page.ts client/src/pages/pack-cards-page.tsx client/src/features/review/hooks/use-review-session.ts client/src/features/review/hooks/use-global-review-session.ts client/src/features/review/hooks/use-quick-review.ts
git commit -m "refactor: use firestore repositories in main hooks"
```

---

### Task 9: Deprecation Notes, Anti-Regression Scan, and Full Verification

**Files:**

- Create: `client/scripts/check-firestore-single-record-writes.mjs`
- Modify: `client/package.json`
- Modify: `client/src/lib/api/client.ts`
- Modify: `client/src/lib/api/indexeddb-client.ts`
- Modify: `client/src/lib/api/firestore-client.ts`

- [ ] **Step 1: Add anti-regression scanner**

Create `client/scripts/check-firestore-single-record-writes.mjs`:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const output = execFileSync("rg", [
	"--files",
	"src",
], { cwd: root, encoding: "utf8" });

const allowed = [
	"src/lib/api/",
	".test.ts",
	".test.tsx",
	"src/features/import/local-data-import.ts",
];

const patterns = [
	/for\s*\([^)]*\)\s*{[^}]*await\s+client\.put/s,
	/for\s*\([^)]*\)\s*{[^}]*await\s+client\.delete/s,
	/for\s*\([^)]*\)\s*{[^}]*await\s+deleteDoc/s,
	/Promise\.all\s*\([^)]*createCard/s,
];

const violations = [];

for (const file of output.trim().split("\n")) {
	if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
	if (allowed.some((entry) => file.includes(entry))) continue;
	const text = readFileSync(join(root, file), "utf8");
	for (const pattern of patterns) {
		if (pattern.test(text)) {
			violations.push(`${file}: ${pattern}`);
		}
	}
}

if (violations.length > 0) {
	console.error("Single-record Firestore write patterns found:");
	for (const violation of violations) console.error(`- ${violation}`);
	process.exit(1);
}
```

- [ ] **Step 2: Add package script**

Modify `client/package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "check:firestore-writes": "node scripts/check-firestore-single-record-writes.mjs",
  "preview": "vite preview",
  "test": "vitest",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

- [ ] **Step 3: Mark legacy APIs deprecated**

Add JSDoc to `client/src/lib/api/client.ts`:

```ts
/**
 * @deprecated Main cloud workflows should use Firestore repositories under
 * `@/lib/data/repositories`. This generic client remains for legacy
 * IndexedDB import support and compatibility tests.
 */
export type ApiClient = {
```

Add similar module-level comments to `indexeddb-client.ts` and `firestore-client.ts`.

- [ ] **Step 4: Run scanner**

Run:

```bash
cd client && npm run check:firestore-writes
```

Expected: PASS. If it fails on legitimate legacy code, narrow the allowlist to the exact file and add a comment in the script explaining why that file is allowed.

- [ ] **Step 5: Run full tests**

Run:

```bash
cd client && npm test -- --run
```

Expected: PASS.

- [ ] **Step 6: Run production build**

Run:

```bash
cd client && npm run build
```

Expected: PASS.

- [ ] **Step 7: Final search**

Run:

```bash
rg -n "createApiClient\\(|client\\.put\\(|client\\.delete\\(|await deleteDoc|Promise\\.all\\(.*createCard" client/src
```

Expected: matches are limited to deprecated API modules, tests, or documented compatibility paths.

- [ ] **Step 8: Commit**

```bash
git add client/scripts/check-firestore-single-record-writes.mjs client/package.json client/src/lib/api/client.ts client/src/lib/api/indexeddb-client.ts client/src/lib/api/firestore-client.ts
git commit -m "chore: guard firestore repository migration"
```

---

## Self-Review

- Spec coverage: helpers, repositories, cache, batch writes, profile delete, pack delete, review persistence, import/export, UI migration, IndexedDB deprecation, and anti-regression scanning are covered.
- Scope: this is a large but coherent data-access migration. The tasks are ordered so each can pass tests independently and commit separately.
- Empty-marker scan: the plan avoids markers that leave work undefined. One implementation note in Task 7 says to choose the existing planned-record profile id if `currentProfileId` is not available; that is an explicit branch based on current type shape, not an unfilled branch.
- Type consistency: repository factory names and method names match across tasks. Shared test utility types use the existing `StoreName` and `StoreValue` types.
