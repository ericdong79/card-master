import {
	writeBatch,
	type DocumentData,
	type DocumentReference,
	type WriteBatch,
} from "firebase/firestore";

import { getFirestoreDb, sanitizeFirestoreDocument } from "./firestore-store";

export const FIRESTORE_BATCH_WRITE_LIMIT = 450;

export type BatchOperation =
	| {
			type: "set";
			ref: DocumentReference<DocumentData>;
			value: DocumentData;
	  }
	| { type: "delete"; ref: DocumentReference<DocumentData> };

type BatchLike = {
	set(ref: DocumentReference<DocumentData>, value: DocumentData): void;
	delete(ref: DocumentReference<DocumentData>): void;
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
		options.createBatch ?? (() => writeBatch(getFirestoreDb()) as WriteBatch);
	let batchCount = 0;
	let hasCommitted = false;

	try {
		for (
			let index = 0;
			index < operations.length;
			index += FIRESTORE_BATCH_WRITE_LIMIT
		) {
			const batch = createBatch();
			const chunk = operations.slice(index, index + FIRESTORE_BATCH_WRITE_LIMIT);

			for (const operation of chunk) {
				if (operation.type === "set") {
					batch.set(operation.ref, sanitizeFirestoreDocument(operation.value));
				} else {
					batch.delete(operation.ref);
				}
			}

			await batch.commit();
			hasCommitted = true;
			batchCount += 1;
		}
	} finally {
		if (hasCommitted) {
			options.invalidate?.();
		}
	}

	return { batchCount, operationCount: operations.length };
}
