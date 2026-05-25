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
	type Firestore,
	type QueryConstraint,
} from "firebase/firestore";

import type { ApiClient, QueryOptions, StoreName, StoreValue } from "./client";
import { FIRESTORE_COLLECTIONS, getCardMasterFirestore } from "../firebase/firestore";

export {
	FIRESTORE_IN_FILTER_LIMIT,
	chunkFirestoreInValues,
} from "@/lib/data/firestore/id-chunks";

const STORE_TO_COLLECTION: Record<StoreName, string> = {
	card_pack: FIRESTORE_COLLECTIONS.cardPacks,
	card: FIRESTORE_COLLECTIONS.cards,
	card_mastery_state: FIRESTORE_COLLECTIONS.cardMasteryStates,
	card_scheduling_state: FIRESTORE_COLLECTIONS.cardSchedulingStates,
	scheduling_profile: FIRESTORE_COLLECTIONS.schedulingProfiles,
	review_event: FIRESTORE_COLLECTIONS.reviewEvents,
};

function collectionNameForStore(store: StoreName): string {
	return STORE_TO_COLLECTION[store];
}

let firestoreInstance: Firestore | null = null;

function getFirestore(): Firestore {
	firestoreInstance ??= getCardMasterFirestore();
	return firestoreInstance;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === "[object Object]";
}

function sanitizeFirestoreValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) =>
			item === undefined ? null : sanitizeFirestoreValue(item),
		);
	}

	if (!isPlainRecord(value)) {
		return value;
	}

	const sanitized: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		if (item !== undefined) {
			sanitized[key] = sanitizeFirestoreValue(item);
		}
	}
	return sanitized;
}

function sanitizeFirestoreDocument(record: DocumentData): DocumentData {
	return sanitizeFirestoreValue(record) as DocumentData;
}

function normalizeSnapshotValue<S extends StoreName>(
	data: DocumentData,
	docId: string,
): StoreValue<S> {
	return {
		...data,
		id: typeof data.id === "string" && data.id.length > 0 ? data.id : docId,
	} as StoreValue<S>;
}

function applyQueryOptions<S extends StoreName>(
	records: StoreValue<S>[],
	options?: QueryOptions<StoreValue<S>>,
): StoreValue<S>[] {
	const filtered = options?.filter ? records.filter(options.filter) : records;
	if (options?.sortBy) {
		return [...filtered].sort(options.sortBy);
	}
	return filtered;
}

const DEFAULT_CACHE_TTL_MS = 60_000;

type CachedRecords = {
	expiresAt: number;
	records: StoreValue<StoreName>[];
};

const readCache = new Map<string, CachedRecords>();

function readCacheKey(store: StoreName, cacheKey: string): string {
	return `${store}:${cacheKey}`;
}

function getCachedRecords<S extends StoreName>(
	store: S,
	options?: QueryOptions<StoreValue<S>>,
): StoreValue<S>[] | null {
	if (!options?.cacheKey) return null;

	const cached = readCache.get(readCacheKey(store, options.cacheKey));
	if (!cached) return null;
	if (cached.expiresAt <= Date.now()) {
		readCache.delete(readCacheKey(store, options.cacheKey));
		return null;
	}
	return cached.records as StoreValue<S>[];
}

function setCachedRecords<S extends StoreName>(
	store: S,
	options: QueryOptions<StoreValue<S>> | undefined,
	records: StoreValue<S>[],
): void {
	if (!options?.cacheKey) return;

	readCache.set(readCacheKey(store, options.cacheKey), {
		expiresAt: Date.now() + (options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
		records,
	});
}

export function clearFirestoreReadCache(store?: StoreName): void {
	if (!store) {
		readCache.clear();
		return;
	}

	const prefix = `${store}:`;
	for (const key of readCache.keys()) {
		if (key.startsWith(prefix)) {
			readCache.delete(key);
		}
	}
}

function defaultOrderConstraints(store: StoreName): QueryConstraint[] {
	if (store === "review_event") {
		return [orderBy("reviewed_at", "asc")];
	}

	return [orderBy("created_at", "asc")];
}

export function createFirestoreApiClient(): ApiClient {
	const client: ApiClient = {
		list: async (store, options) => {
			const db = getFirestore();
			const collectionRef = collection(db, collectionNameForStore(store));
			const snapshot = await getDocs(
				query(collectionRef, ...defaultOrderConstraints(store)),
			);
			const records = snapshot.docs.map((documentSnapshot) =>
				normalizeSnapshotValue<typeof store>(
					documentSnapshot.data(),
					documentSnapshot.id,
				),
			);
			return applyQueryOptions(records, options);
		},
		get: async (store, id) => {
			const db = getFirestore();
			const documentRef = doc(db, collectionNameForStore(store), id);
			const snapshot = await getDoc(documentRef);
			if (!snapshot.exists()) return null;
			return normalizeSnapshotValue<typeof store>(snapshot.data(), snapshot.id);
		},
		put: async (store, record) => {
			const db = getFirestore();
			const documentRef = doc(db, collectionNameForStore(store), record.id);
			await setDoc(documentRef, sanitizeFirestoreDocument(record));
			clearFirestoreReadCache(store);
			return record;
		},
		delete: async (store, id) => {
			const db = getFirestore();
			const documentRef = doc(db, collectionNameForStore(store), id);
			await deleteDoc(documentRef);
			clearFirestoreReadCache(store);
		},
	};
	firestoreClients.add(client);
	return client;
}

const firestoreClients = new WeakSet<ApiClient>();

export function isFirestoreApiClient(client: ApiClient): boolean {
	return firestoreClients.has(client);
}

export async function listFirestoreRecords<S extends StoreName>(
	store: S,
	constraints: QueryConstraint[],
	options?: QueryOptions<StoreValue<S>>,
): Promise<StoreValue<S>[]> {
	const cachedRecords = getCachedRecords(store, options);
	if (cachedRecords) {
		return applyQueryOptions(cachedRecords, options);
	}

	const db = getFirestore();
	const collectionRef = collection(db, collectionNameForStore(store));
	const snapshot = await getDocs(query(collectionRef, ...constraints));
	const records = snapshot.docs.map((documentSnapshot) =>
		normalizeSnapshotValue<S>(documentSnapshot.data(), documentSnapshot.id),
	);
	setCachedRecords(store, options, records);
	return applyQueryOptions(records, options);
}

export function ownedStoreCacheKey(
	accountUserId: string,
	profileId: string,
	qualifier = "all",
): string {
	return `${accountUserId}:${profileId}:${qualifier}`;
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

export function learnerOwnershipConstraints(
	accountUserId: string,
	profileId: string,
): QueryConstraint[] {
	return [
		where("account_user_id", "==", accountUserId),
		where("learner_profile_id", "==", profileId),
	];
}
