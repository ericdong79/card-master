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

	for (
		let index = 0;
		index < operations.length;
		index += FIRESTORE_BATCH_WRITE_LIMIT
	) {
		const batch = createBatch();
		const chunk = operations.slice(index, index + FIRESTORE_BATCH_WRITE_LIMIT);

		for (const operation of chunk) {
			if (operation.type === "set") {
				batch.set(
					operation.ref,
					sanitizeFirestoreDocument(operation.value as never),
				);
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
