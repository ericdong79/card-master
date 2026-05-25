import { describe, expect, it, vi } from "vitest";
import { commitBatchedWrites, type BatchOperation } from "./batch-writer";

function createBatchFactory() {
	const commits: BatchOperation[][] = [];
	const createdBatches: BatchOperation[][] = [];
	return {
		commits,
		createdBatches,
		createBatch: () => {
			const operations: BatchOperation[] = [];
			createdBatches.push(operations);
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

		await commitBatchedWrites([{ type: "delete", ref: "doc-1" }], {
			createBatch: factory.createBatch,
			invalidate,
		});

		expect(invalidate).toHaveBeenCalledTimes(1);
	});
});
