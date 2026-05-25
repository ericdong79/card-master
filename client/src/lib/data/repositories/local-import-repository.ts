import type { ApiClient, StoreName, StoreValue } from "@/lib/api/client";
import type { Card } from "@/lib/api/entities/card";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import {
	clearFirestoreReadCache,
	isFirestoreApiClient,
} from "@/lib/api/firestore-client";
import {
	commitBatchedWrites,
	type BatchOperation,
} from "@/lib/data/firestore/batch-writer";
import { storeDocRef } from "@/lib/data/firestore/firestore-store";
import { clearQueryCache } from "@/lib/data/firestore/query-cache";

import {
	upsertRecord,
	type RepositoryTestDb,
} from "./repository-test-utils";

type Imported<T> = T & {
	import_metadata?: {
		imported_from: "local_legacy";
		imported_at: string;
		source_id: string;
	};
};

export type LocalImportPlanRecords = {
	cardPacks: Imported<CardPack>[];
	cards: Imported<Card>[];
	schedulingProfiles: Imported<SchedulingProfile>[];
	schedulingStates: Imported<CardSchedulingState>[];
	reviewEvents: Imported<ReviewEvent>[];
	cardMasteryStates: Imported<CardMasteryState>[];
};

type ClearLegacyReadCache = (store?: StoreName) => void;

export type LocalImportRepositoryDeps = {
	db?: RepositoryTestDb;
	client?: ApiClient;
	clearLegacyReadCache?: ClearLegacyReadCache;
};

const LOCAL_IMPORT_STORES = [
	"card_pack",
	"card",
	"scheduling_profile",
	"review_event",
	"card_scheduling_state",
	"card_mastery_state",
] as const satisfies StoreName[];

function recordsByStore(plan: LocalImportPlanRecords): {
	[S in StoreName]?: StoreValue<S>[];
} {
	return {
		card_pack: plan.cardPacks,
		card: plan.cards,
		scheduling_profile: plan.schedulingProfiles,
		review_event: plan.reviewEvents,
		card_scheduling_state: plan.schedulingStates,
		card_mastery_state: plan.cardMasteryStates,
	};
}

function recordsToBatchOperations<S extends StoreName>(
	store: S,
	records: StoreValue<S>[],
): BatchOperation[] {
	return records.map((record) => ({
		type: "set",
		ref: storeDocRef(store, record.id),
		value: record,
	}));
}

export function createLocalImportRepository(
	deps: LocalImportRepositoryDeps = {},
) {
	const clearLegacyReadCache =
		deps.clearLegacyReadCache ?? clearFirestoreReadCache;

	async function writePlannedRecords(plan: LocalImportPlanRecords): Promise<void> {
		const groupedRecords = recordsByStore(plan);

		if (deps.db) {
			for (const store of LOCAL_IMPORT_STORES) {
				for (const record of groupedRecords[store] ?? []) {
					upsertRecord(deps.db, store, record);
				}
			}
			return;
		}

		if (deps.client && !isFirestoreApiClient(deps.client)) {
			for (const store of LOCAL_IMPORT_STORES) {
				for (const record of groupedRecords[store] ?? []) {
					await deps.client.put(store, record);
				}
			}
			return;
		}

		const operations = LOCAL_IMPORT_STORES.flatMap((store) =>
			recordsToBatchOperations(store, groupedRecords[store] ?? []),
		);
		await commitBatchedWrites(operations, {
			invalidate: () => {
				clearQueryCache();
				for (const store of LOCAL_IMPORT_STORES) {
					clearLegacyReadCache(store);
				}
			},
		});
	}

	return { writePlannedRecords };
}
