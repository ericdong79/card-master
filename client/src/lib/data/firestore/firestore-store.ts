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
import {
	FIRESTORE_COLLECTIONS,
	getCardMasterFirestore,
} from "@/lib/firebase/firestore";

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
