import type { Card } from "./entities/card";
import type { CardPack } from "./entities/card-pack";
import type { CardSchedulingState } from "./entities/card-scheduling-state";
import type { ReviewEvent } from "./entities/review-event";
import type { SchedulingProfile } from "./entities/scheduling-profile";

type StoreValueMap = {
	card_pack: CardPack;
	card: Card;
	card_scheduling_state: CardSchedulingState;
	scheduling_profile: SchedulingProfile;
	review_event: ReviewEvent;
};

type StoreName = keyof StoreValueMap;

type StoreValue<S extends StoreName> = StoreValueMap[S];

type QueryOptions<T> = {
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

const DB_NAME = "card-master";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
	if (typeof indexedDB === "undefined") {
		throw new Error("IndexedDB is not available in this environment.");
	}

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;

			if (!db.objectStoreNames.contains("card_pack")) {
				const store = db.createObjectStore("card_pack", { keyPath: "id" });
				store.createIndex("owner_user_id", "owner_user_id", { unique: false });
			}

			if (!db.objectStoreNames.contains("card")) {
				const store = db.createObjectStore("card", { keyPath: "id" });
				store.createIndex("owner_user_id", "owner_user_id", { unique: false });
				store.createIndex("card_pack_id", "card_pack_id", { unique: false });
			}

			if (!db.objectStoreNames.contains("scheduling_profile")) {
				const store = db.createObjectStore("scheduling_profile", {
					keyPath: "id",
				});
				store.createIndex("owner_user_id", "owner_user_id", { unique: false });
			}

			if (!db.objectStoreNames.contains("card_scheduling_state")) {
				const store = db.createObjectStore("card_scheduling_state", {
					keyPath: "id",
				});
				store.createIndex("owner_user_id", "owner_user_id", { unique: false });
				store.createIndex("card_id", "card_id", { unique: false });
				store.createIndex("profile_id", "profile_id", { unique: false });
			}

			if (!db.objectStoreNames.contains("review_event")) {
				const store = db.createObjectStore("review_event", {
					keyPath: "id",
				});
				store.createIndex("owner_user_id", "owner_user_id", { unique: false });
				store.createIndex("card_id", "card_id", { unique: false });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error("Failed to open IndexedDB"));
		request.onblocked = () => {
			reject(new Error("IndexedDB upgrade was blocked. Close other tabs and retry."));
		};
	});
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result as T);
		request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
	});
}

function applyQuery<T>(records: T[], options?: QueryOptions<T>): T[] {
	const filtered = options?.filter ? records.filter(options.filter) : records;
	if (options?.sortBy) {
		return [...filtered].sort(options.sortBy);
	}
	return filtered;
}

export function createApiClient(): ApiClient {
	const dbPromise = openDatabase();

	const getAll = async <S extends StoreName>(storeName: S): Promise<StoreValue<S>[]> => {
		const db = await dbPromise;
		const tx = db.transaction(storeName, "readonly");
		const store = tx.objectStore(storeName);
		const request = store.getAll();
		const result = await promisifyRequest(request);
		return result as StoreValue<S>[];
	};

	const getById = async <S extends StoreName>(
		storeName: S,
		id: string,
	): Promise<StoreValue<S> | null> => {
		const db = await dbPromise;
		const tx = db.transaction(storeName, "readonly");
		const store = tx.objectStore(storeName);
		const request = store.get(id);
		const result = await promisifyRequest(request);
		return (result as StoreValue<S> | undefined) ?? null;
	};

	const putRecord = async <S extends StoreName>(
		storeName: S,
		record: StoreValue<S>,
	): Promise<StoreValue<S>> => {
		const db = await dbPromise;
		return new Promise<StoreValue<S>>((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			tx.oncomplete = () => resolve(record);
			tx.onerror = () =>
				reject(tx.error ?? new Error(`Failed to persist ${storeName} record`));
			tx.onabort = () =>
				reject(tx.error ?? new Error(`Transaction aborted for ${storeName}`));
			const store = tx.objectStore(storeName);
			store.put(record);
		});
	};

	const deleteRecord = async <S extends StoreName>(
		storeName: S,
		id: string,
	): Promise<void> => {
		const db = await dbPromise;
		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			tx.oncomplete = () => resolve();
			tx.onerror = () =>
				reject(tx.error ?? new Error(`Failed to delete ${storeName} record`));
			tx.onabort = () =>
				reject(tx.error ?? new Error(`Transaction aborted for ${storeName}`));
			const store = tx.objectStore(storeName);
			store.delete(id);
		});
	};

	return {
		list: async (store, options) => applyQuery(await getAll(store), options),
		get: getById,
		put: putRecord,
		delete: deleteRecord,
	};
}
