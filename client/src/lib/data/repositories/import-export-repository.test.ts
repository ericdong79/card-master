import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/firestore/batch-writer", () => ({
	commitBatchedWrites: vi.fn(async (operations, options) => {
		options?.invalidate?.();
		return { batchCount: operations.length > 0 ? 1 : 0, operationCount: operations.length };
	}),
}));

vi.mock("@/lib/data/firestore/firestore-store", () => ({
	queryStoreRecords: vi.fn(async () => []),
	storeDocRef: vi.fn((store: string, id: string) => ({ store, id })),
}));

vi.mock("@/lib/data/firestore/query-cache", () => ({
	clearQueryCache: vi.fn(),
}));

vi.mock("@/lib/data/firestore/firestore-client", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/lib/data/firestore/firestore-client")>();
	return {
		...actual,
		clearFirestoreReadCache: vi.fn(),
	};
});

import type { CardMasterExportPayload } from "./import-export-repository";
import { createImportExportRepository } from "./import-export-repository";
import { createRepositoryTestDb } from "./repository-test-utils";
import { clearFirestoreReadCache } from "@/lib/data/firestore/firestore-client";
import { commitBatchedWrites } from "@/lib/data/firestore/batch-writer";
import { clearQueryCache } from "@/lib/data/firestore/query-cache";

const timestamp = "2026-01-01T00:00:00.000Z";

describe("createImportExportRepository", () => {
	it("imports packs and cards with mapped ids and target cloud ownership", async () => {
		const db = createRepositoryTestDb();
		const ids = ["mapped-pack", "mapped-card"];
		const repository = createImportExportRepository({
			db,
			generateId: () => ids.shift() ?? "extra-id",
			now: () => timestamp,
		});
		const payload: CardMasterExportPayload = {
			format: "card-master-export",
			version: 1,
			exported_at: timestamp,
			include_review_state: false,
			packs: [
				{
					id: "source-pack",
					name: "Imported",
					type: "basic",
					owner_user_id: "source-profile",
					account_user_id: "source-account",
					profile_id: "source-profile",
					status: "active",
					created_at: timestamp,
					updated_at: null,
				},
			],
			cards: [
				{
					id: "source-card",
					card_pack_id: "source-pack",
					owner_user_id: "source-profile",
					account_user_id: "source-account",
					profile_id: "source-profile",
					prompt: "front",
					answer: "back",
					status: "active",
					created_at: timestamp,
					updated_at: null,
				},
			],
		};

		const summary = await repository.importCardMasterData({
			accountUserId: "target-account",
			profileId: "target-profile",
			payload,
			importReviewState: false,
		});

		expect(summary).toEqual({
			cardPacks: 1,
			cards: 1,
			reviewEvents: 0,
			schedulingStates: 0,
		});
		expect(db.card_pack).toEqual([
			expect.objectContaining({
				id: "mapped-pack",
				account_user_id: "target-account",
				profile_id: "target-profile",
				owner_user_id: "target-profile",
			}),
		]);
		expect(db.card).toEqual([
			expect.objectContaining({
				id: "mapped-card",
				card_pack_id: "mapped-pack",
				account_user_id: "target-account",
				profile_id: "target-profile",
				owner_user_id: "target-profile",
			}),
		]);
	});

	it("uses batched writes and clears repository and legacy caches for production imports", async () => {
		vi.mocked(commitBatchedWrites).mockClear();
		vi.mocked(clearQueryCache).mockClear();
		vi.mocked(clearFirestoreReadCache).mockClear();

		const ids = ["mapped-pack", "mapped-card"];
		const repository = createImportExportRepository({
			generateId: () => ids.shift() ?? "extra-id",
			now: () => timestamp,
		});
		const payload: CardMasterExportPayload = {
			format: "card-master-export",
			version: 1,
			exported_at: timestamp,
			include_review_state: false,
			packs: [
				{
					id: "source-pack",
					name: "Imported",
					type: "basic",
					owner_user_id: "source-profile",
					account_user_id: "source-account",
					profile_id: "source-profile",
					status: "active",
					created_at: timestamp,
					updated_at: null,
				},
			],
			cards: [
				{
					id: "source-card",
					card_pack_id: "source-pack",
					owner_user_id: "source-profile",
					account_user_id: "source-account",
					profile_id: "source-profile",
					prompt: "front",
					answer: "back",
					status: "active",
					created_at: timestamp,
					updated_at: null,
				},
			],
		};

		await repository.importCardMasterData({
			accountUserId: "target-account",
			profileId: "target-profile",
			payload,
			importReviewState: false,
		});

		expect(commitBatchedWrites).toHaveBeenCalledTimes(1);
		expect(vi.mocked(commitBatchedWrites).mock.calls[0][0]).toEqual([
			expect.objectContaining({
				type: "set",
				ref: { store: "card_pack", id: "mapped-pack" },
			}),
			expect.objectContaining({
				type: "set",
				ref: { store: "card", id: "mapped-card" },
			}),
		]);
		expect(clearQueryCache).toHaveBeenCalledWith({
			accountUserId: "target-account",
			profileId: "target-profile",
		});
		expect(clearFirestoreReadCache).toHaveBeenCalledWith("card_pack");
		expect(clearFirestoreReadCache).toHaveBeenCalledWith("card");
	});
});
