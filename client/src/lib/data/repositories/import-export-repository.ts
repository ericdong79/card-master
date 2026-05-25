import { where } from "firebase/firestore";

import type { ApiClient, QueryOptions, StoreName, StoreValue } from "@/lib/api/client";
import type { Card } from "@/lib/api/entities/card";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import {
	clearFirestoreReadCache,
	chunkFirestoreInValues,
	isFirestoreApiClient,
	learnerOwnershipConstraints as legacyLearnerOwnershipConstraints,
	listFirestoreRecords,
	ownershipConstraints as legacyOwnershipConstraints,
} from "@/lib/api/firestore-client";
import {
	generateId as defaultGenerateId,
	nowIso as defaultNow,
} from "@/lib/api/utils";
import {
	commitBatchedWrites,
	type BatchOperation,
} from "@/lib/data/firestore/batch-writer";
import { queryStoreRecords, storeDocRef } from "@/lib/data/firestore/firestore-store";
import {
	hasLearnerOwnership,
	hasProfileOwnership,
	learnerOwnershipConstraints,
	profileOwnershipConstraints,
} from "@/lib/data/firestore/ownership";
import { clearQueryCache } from "@/lib/data/firestore/query-cache";

import {
	upsertRecord,
	type RepositoryTestDb,
} from "./repository-test-utils";

const EXPORT_FORMAT = "card-master-export";
const EXPORT_VERSION = 1;

type ExportReviewState = {
	scheduling_profiles: SchedulingProfile[];
	scheduling_states: CardSchedulingState[];
	review_events: ReviewEvent[];
	card_mastery_states?: CardMasteryState[];
};

export type CardMasterExportPayload = {
	format: typeof EXPORT_FORMAT;
	version: typeof EXPORT_VERSION;
	exported_at: string;
	include_review_state: boolean;
	packs: CardPack[];
	cards: Card[];
	review_state?: ExportReviewState;
};

export type BuildExportPayloadOptions = {
	cardPackIds: string[];
	includeReviewState: boolean;
};

export type ImportDataOptions = {
	importReviewState: boolean;
};

export type ImportDataSummary = {
	cardPacks: number;
	cards: number;
	reviewEvents: number;
	schedulingStates: number;
};

type ProfileScopeInput = {
	accountUserId: string;
	profileId: string;
};

type BuildExportPayloadInput = ProfileScopeInput & BuildExportPayloadOptions;

type ImportDataInput = ProfileScopeInput &
	ImportDataOptions & {
		payload: CardMasterExportPayload;
	};

type ClearLegacyReadCache = (store?: StoreName) => void;

export type ImportExportRepositoryDeps = {
	db?: RepositoryTestDb;
	client?: ApiClient;
	now?: () => string;
	generateId?: () => string;
	clearLegacyReadCache?: ClearLegacyReadCache;
};

const IMPORT_STORES = [
	"card_pack",
	"card",
	"scheduling_profile",
	"review_event",
	"card_scheduling_state",
	"card_mastery_state",
] as const satisfies StoreName[];

function assertPayload(value: unknown): asserts value is CardMasterExportPayload {
	if (!value || typeof value !== "object") {
		throw new Error("Invalid export file: expected JSON object.");
	}

	const payload = value as Record<string, unknown>;
	if (payload.format !== EXPORT_FORMAT || payload.version !== EXPORT_VERSION) {
		throw new Error("Unsupported export file format.");
	}

	if (!Array.isArray(payload.packs) || !Array.isArray(payload.cards)) {
		throw new Error("Invalid export file: missing packs or cards.");
	}

	if (payload.review_state != null && typeof payload.review_state !== "object") {
		throw new Error("Invalid export file: malformed review_state.");
	}

	const reviewState = payload.review_state as Record<string, unknown> | undefined;
	if (reviewState?.card_mastery_states != null && !Array.isArray(reviewState.card_mastery_states)) {
		throw new Error("Invalid export file: malformed review_state.card_mastery_states.");
	}
}

function withProfileOwnership<T extends object>(
	record: T,
	accountUserId: string,
	profileId: string,
): T & {
	account_user_id: string;
	profile_id: string;
	owner_user_id: string;
} {
	return {
		...record,
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
	};
}

function withLearnerOwnership<T extends object>(
	record: T,
	accountUserId: string,
	profileId: string,
): T & {
	account_user_id: string;
	learner_profile_id: string;
	owner_user_id: string;
} {
	return {
		...record,
		account_user_id: accountUserId,
		learner_profile_id: profileId,
		owner_user_id: profileId,
	};
}

function applyQueryOptions<S extends StoreName>(
	records: StoreValue<S>[],
	options?: QueryOptions<StoreValue<S>>,
): StoreValue<S>[] {
	const filtered = options?.filter ? records.filter(options.filter) : records;
	return options?.sortBy ? [...filtered].sort(options.sortBy) : filtered;
}

function listFromDb<S extends StoreName>(
	db: RepositoryTestDb,
	store: S,
	options?: QueryOptions<StoreValue<S>>,
): StoreValue<S>[] {
	return applyQueryOptions(db[store] as StoreValue<S>[], options);
}

function putDbRecord<S extends StoreName>(
	db: RepositoryTestDb,
	store: S,
	record: StoreValue<S>,
): void {
	upsertRecord(db, store, record);
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

export function parseCardMasterExport(text: string): CardMasterExportPayload {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error("Invalid export file: JSON parse failed.");
	}

	assertPayload(parsed);
	return parsed;
}

export function downloadCardMasterExport(
	payload: CardMasterExportPayload,
	fileName = `card-master-export-${new Date().toISOString().slice(0, 10)}.json`,
) {
	const text = JSON.stringify(payload, null, 2);
	const blob = new Blob([text], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export function createImportExportRepository(
	deps: ImportExportRepositoryDeps = {},
) {
	const now = deps.now ?? defaultNow;
	const generateId = deps.generateId ?? defaultGenerateId;
	const clearLegacyReadCache =
		deps.clearLegacyReadCache ?? clearFirestoreReadCache;

	async function listProfileOwnedRecords<S extends StoreName>(
		store: S,
		accountUserId: string,
		profileId: string,
		options: QueryOptions<StoreValue<S>>,
	): Promise<StoreValue<S>[]> {
		if (deps.db) {
			return listFromDb(deps.db, store, options);
		}

		if (deps.client) {
			return isFirestoreApiClient(deps.client)
				? listFirestoreRecords(
						store,
						legacyOwnershipConstraints(accountUserId, profileId),
						options,
					)
				: deps.client.list(store, options);
		}

		return applyQueryOptions(
			(
				await queryStoreRecords(
					store,
					profileOwnershipConstraints(accountUserId, profileId),
				)
			).filter((record) =>
				hasProfileOwnership(record, accountUserId, profileId),
			),
			options,
		);
	}

	async function listProfileOwnedRecordsByCardIds<
		S extends "card_mastery_state" | "review_event",
	>(
		store: S,
		accountUserId: string,
		profileId: string,
		cardIds: string[],
		options: QueryOptions<StoreValue<S>>,
	): Promise<StoreValue<S>[]> {
		if (cardIds.length === 0) return [];

		if (deps.db) {
			return listFromDb(deps.db, store, options);
		}

		if (deps.client) {
			if (!isFirestoreApiClient(deps.client)) {
				return deps.client.list(store, options);
			}

			const records = await Promise.all(
				chunkFirestoreInValues(cardIds).map((chunk) =>
					listFirestoreRecords(
						store,
						[
							...legacyOwnershipConstraints(accountUserId, profileId),
							where("card_id", "in", chunk),
						],
						options,
					),
				),
			);
			return records.flat();
		}

		const records = await Promise.all(
			chunkFirestoreInValues(cardIds).map((chunk) =>
				queryStoreRecords(store, [
					...profileOwnershipConstraints(accountUserId, profileId),
					where("card_id", "in", chunk),
				]),
			),
		);
		return applyQueryOptions(records.flat(), options);
	}

	async function listLearnerOwnedSchedulingStatesByCardIds(
		accountUserId: string,
		profileId: string,
		cardIds: string[],
		options: QueryOptions<CardSchedulingState>,
	): Promise<CardSchedulingState[]> {
		if (cardIds.length === 0) return [];

		if (deps.db) {
			return listFromDb(deps.db, "card_scheduling_state", options);
		}

		if (deps.client) {
			if (!isFirestoreApiClient(deps.client)) {
				return deps.client.list("card_scheduling_state", options);
			}

			const records = await Promise.all(
				chunkFirestoreInValues(cardIds).map((chunk) =>
					listFirestoreRecords(
						"card_scheduling_state",
						[
							...legacyLearnerOwnershipConstraints(accountUserId, profileId),
							where("card_id", "in", chunk),
						],
						options,
					),
				),
			);
			return records.flat();
		}

		const records = await Promise.all(
			chunkFirestoreInValues(cardIds).map((chunk) =>
				queryStoreRecords<"card_scheduling_state">("card_scheduling_state", [
					...learnerOwnershipConstraints(accountUserId, profileId),
					where("card_id", "in", chunk),
				]),
			),
		);
		return applyQueryOptions<"card_scheduling_state">(records.flat(), options);
	}

	async function writeRecords(
		accountUserId: string,
		profileId: string,
		recordsByStore: {
			[S in StoreName]?: StoreValue<S>[];
		},
	): Promise<void> {
		if (deps.db) {
			for (const store of IMPORT_STORES) {
				for (const record of recordsByStore[store] ?? []) {
					putDbRecord(deps.db, store, record);
				}
			}
			return;
		}

		if (deps.client && !isFirestoreApiClient(deps.client)) {
			for (const store of IMPORT_STORES) {
				for (const record of recordsByStore[store] ?? []) {
					await deps.client.put(store, record);
				}
			}
			return;
		}

		const operations = IMPORT_STORES.flatMap((store) =>
			recordsToBatchOperations(store, recordsByStore[store] ?? []),
		);
		await commitBatchedWrites(operations, {
			invalidate: () => {
				clearQueryCache({ accountUserId, profileId });
				for (const store of IMPORT_STORES) {
					clearLegacyReadCache(store);
				}
			},
		});
	}

	async function buildCardMasterExport({
		accountUserId,
		profileId,
		cardPackIds,
		includeReviewState,
	}: BuildExportPayloadInput): Promise<CardMasterExportPayload> {
		if (cardPackIds.length === 0) {
			throw new Error("Select at least one card pack to export.");
		}

		const selectedPackIds = new Set(cardPackIds);
		const [packs, cards] = await Promise.all([
			listProfileOwnedRecords("card_pack", accountUserId, profileId, {
				filter: (pack) =>
					hasProfileOwnership(pack, accountUserId, profileId) &&
					selectedPackIds.has(pack.id),
			}),
			listProfileOwnedRecords("card", accountUserId, profileId, {
				filter: (card) =>
					hasProfileOwnership(card, accountUserId, profileId) &&
					selectedPackIds.has(card.card_pack_id),
			}),
		]);

		const payload: CardMasterExportPayload = {
			format: EXPORT_FORMAT,
			version: EXPORT_VERSION,
			exported_at: now(),
			include_review_state: includeReviewState,
			packs,
			cards,
		};

		if (!includeReviewState) {
			return payload;
		}

		const cardIds = cards.map((card) => card.id);
		const cardIdSet = new Set(cardIds);
		const [schedulingStates, reviewEvents, masteryStates] = await Promise.all([
			listLearnerOwnedSchedulingStatesByCardIds(
				accountUserId,
				profileId,
				cardIds,
				{
					filter: (state) =>
						hasLearnerOwnership(state, accountUserId, profileId) &&
						cardIdSet.has(state.card_id),
				},
			),
			listProfileOwnedRecordsByCardIds(
				"review_event",
				accountUserId,
				profileId,
				cardIds,
				{
					filter: (event) =>
						hasProfileOwnership(event, accountUserId, profileId) &&
						cardIdSet.has(event.card_id),
				},
			),
			listProfileOwnedRecordsByCardIds(
				"card_mastery_state",
				accountUserId,
				profileId,
				cardIds,
				{
					filter: (state) =>
						hasProfileOwnership(state, accountUserId, profileId) &&
						cardIdSet.has(state.card_id),
				},
			),
		]);

		const profileIdSet = new Set(schedulingStates.map((state) => state.profile_id));
		const schedulingProfiles =
			profileIdSet.size === 0
				? []
				: await listProfileOwnedRecords(
						"scheduling_profile",
						accountUserId,
						profileId,
						{
							filter: (profile) =>
								hasProfileOwnership(profile, accountUserId, profileId) &&
								profileIdSet.has(profile.id),
						},
					);

		payload.review_state = {
			scheduling_profiles: schedulingProfiles,
			scheduling_states: schedulingStates,
			review_events: reviewEvents,
			card_mastery_states: masteryStates,
		};

		return payload;
	}

	async function importCardMasterData({
		accountUserId,
		profileId,
		payload,
		importReviewState,
	}: ImportDataInput): Promise<ImportDataSummary> {
		const importedAt = now();
		const recordsByStore: {
			[S in StoreName]?: StoreValue<S>[];
		} = {};
		const packIdMap = new Map<string, string>();
		const cardIdMap = new Map<string, string>();

		const cardPacks: CardPack[] = payload.packs.map((pack) => {
			const newPackId = generateId();
			packIdMap.set(pack.id, newPackId);
			return {
				...withProfileOwnership(pack, accountUserId, profileId),
				id: newPackId,
			};
		});
		recordsByStore.card_pack = cardPacks;

		const cardsToImport = payload.cards.filter((card) =>
			packIdMap.has(card.card_pack_id),
		);
		const cards: Card[] = [];
		for (const card of cardsToImport) {
			const cardPackId = packIdMap.get(card.card_pack_id);
			if (!cardPackId) continue;

			const newCardId = generateId();
			cardIdMap.set(card.id, newCardId);
			cards.push({
				...withProfileOwnership(card, accountUserId, profileId),
				id: newCardId,
				card_pack_id: cardPackId,
			});
		}
		recordsByStore.card = cards;

		let importedReviewEvents = 0;
		let importedSchedulingStates = 0;

		if (importReviewState && payload.review_state) {
			const reviewState = payload.review_state;
			const schedulingStatesToImport = reviewState.scheduling_states.filter(
				(state) => cardIdMap.has(state.card_id),
			);
			const profileIdSet = new Set(
				schedulingStatesToImport.map((state) => state.profile_id),
			);
			const profileIdMap = new Map<string, string>();
			const availableProfiles = new Map(
				reviewState.scheduling_profiles.map((profile) => [profile.id, profile]),
			);
			const schedulingProfiles: SchedulingProfile[] = [];

			for (const sourceProfileId of profileIdSet) {
				const sourceProfile = availableProfiles.get(sourceProfileId);
				const newProfileId = generateId();
				profileIdMap.set(sourceProfileId, newProfileId);

				schedulingProfiles.push(
					sourceProfile
						? {
								...withProfileOwnership(
									sourceProfile,
									accountUserId,
									profileId,
								),
								id: newProfileId,
							}
						: {
								id: newProfileId,
								account_user_id: accountUserId,
								profile_id: profileId,
								owner_user_id: profileId,
								algorithm_key: "sm2",
								parameters: {},
								version: 1,
								created_at: importedAt,
							},
				);
			}
			recordsByStore.scheduling_profile = schedulingProfiles;

			const reviewEventsToImport = reviewState.review_events.filter((event) =>
				cardIdMap.has(event.card_id),
			);
			const reviewEventIdMap = new Map<string, string>();
			const reviewEvents: ReviewEvent[] = [];

			for (const event of reviewEventsToImport) {
				const mappedCardId = cardIdMap.get(event.card_id);
				if (!mappedCardId) continue;

				const newEventId = generateId();
				reviewEventIdMap.set(event.id, newEventId);
				reviewEvents.push({
					...withProfileOwnership(event, accountUserId, profileId),
					id: newEventId,
					card_id: mappedCardId,
				});
			}
			importedReviewEvents = reviewEvents.length;
			recordsByStore.review_event = reviewEvents;

			const schedulingStates: CardSchedulingState[] = [];
			for (const state of schedulingStatesToImport) {
				const mappedCardId = cardIdMap.get(state.card_id);
				const mappedProfileId = profileIdMap.get(state.profile_id);
				if (!mappedCardId || !mappedProfileId) continue;

				schedulingStates.push({
					...withLearnerOwnership(state, accountUserId, profileId),
					id: generateId(),
					card_id: mappedCardId,
					profile_id: mappedProfileId,
					last_event_id: state.last_event_id
						? reviewEventIdMap.get(state.last_event_id) ?? null
						: null,
				});
			}
			importedSchedulingStates = schedulingStates.length;
			recordsByStore.card_scheduling_state = schedulingStates;

			const masteryStatesToImport = Array.isArray(reviewState.card_mastery_states)
				? reviewState.card_mastery_states.filter((state) =>
						cardIdMap.has(state.card_id),
					)
				: [];
			const masteryStates: CardMasteryState[] = [];

			for (const state of masteryStatesToImport) {
				const mappedCardId = cardIdMap.get(state.card_id);
				if (!mappedCardId) continue;

				masteryStates.push({
					...withProfileOwnership(state, accountUserId, profileId),
					id: generateId(),
					card_id: mappedCardId,
				});
			}
			recordsByStore.card_mastery_state = masteryStates;
		}

		await writeRecords(accountUserId, profileId, recordsByStore);

		return {
			cardPacks: payload.packs.length,
			cards: cardIdMap.size,
			reviewEvents: importedReviewEvents,
			schedulingStates: importedSchedulingStates,
		};
	}

	return {
		buildCardMasterExport,
		importCardMasterData,
		parseCardMasterExport,
		downloadCardMasterExport,
		writeRecords,
	};
}
