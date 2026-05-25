import { describe, expect, it, vi } from "vitest";
import type { DocumentData, DocumentReference } from "firebase/firestore";

import { commitBatchedWrites, type BatchOperation } from "./batch-writer";

const fakeRef = (id: string) => ({ id }) as DocumentReference<DocumentData>;

function createBatchFactory(options: { failCommitAt?: number } = {}) {
	const commits: BatchOperation[][] = [];
	const createdBatches: BatchOperation[][] = [];
	let commitAttempts = 0;
	return {
		commits,
		createdBatches,
		createBatch: () => {
			const operations: BatchOperation[] = [];
			createdBatches.push(operations);
			return {
				set: vi.fn((ref: DocumentReference<DocumentData>, value: DocumentData) => {
					operations.push({ type: "set", ref, value });
				}),
				delete: vi.fn((ref: DocumentReference<DocumentData>) => {
					operations.push({ type: "delete", ref });
				}),
				commit: vi.fn(async () => {
					commitAttempts += 1;
					if (commitAttempts === options.failCommitAt) {
						throw new Error(`commit ${commitAttempts} failed`);
					}
					commits.push([...operations]);
				}),
			};
		},
	};
}

describe("commitBatchedWrites", () => {
	it("does not create a batch for zero operations", async () => {
		const factory = createBatchFactory();

		const result = await commitBatchedWrites([], {
			createBatch: factory.createBatch,
		});

		expect(result).toEqual({ batchCount: 0, operationCount: 0 });
		expect(factory.createdBatches).toEqual([]);
		expect(factory.commits).toEqual([]);
	});

	it("commits 450 operations as one batch", async () => {
		const factory = createBatchFactory();
		const operations = Array.from({ length: 450 }, (_, index) => ({
			type: "delete" as const,
			ref: fakeRef(`doc-${index}`),
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
			ref: fakeRef(`doc-${index}`),
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

		await commitBatchedWrites([{ type: "delete", ref: fakeRef("doc-1") }], {
			createBatch: factory.createBatch,
			invalidate,
		});

		expect(invalidate).toHaveBeenCalledTimes(1);
	});

	it("invalidates cache when a later batch fails after an earlier commit succeeds", async () => {
		const factory = createBatchFactory({ failCommitAt: 2 });
		const invalidate = vi.fn();
		const operations = Array.from({ length: 451 }, (_, index) => ({
			type: "delete" as const,
			ref: fakeRef(`doc-${index}`),
		}));

		await expect(
			commitBatchedWrites(operations, {
				createBatch: factory.createBatch,
				invalidate,
			}),
		).rejects.toThrow("commit 2 failed");

		expect(factory.commits).toHaveLength(1);
		expect(invalidate).toHaveBeenCalledTimes(1);
	});
});
