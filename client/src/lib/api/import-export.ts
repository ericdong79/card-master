import { where } from "firebase/firestore";
import type { ApiClient, QueryOptions, StoreName, StoreValue } from "./client";
import type { Card } from "./entities/card";
import type { CardMasteryState } from "./entities/card-mastery-state";
import type { CardPack } from "./entities/card-pack";
import type { CardSchedulingState } from "./entities/card-scheduling-state";
import type { ReviewEvent } from "./entities/review-event";
import type { SchedulingProfile } from "./entities/scheduling-profile";
import {
	chunkFirestoreInValues,
	isFirestoreApiClient,
	learnerOwnershipConstraints,
	listFirestoreRecords,
	ownershipConstraints,
} from "./firestore-client";
import { generateId, nowIso } from "./utils";

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

type BuildExportPayloadOptions = {
	cardPackIds: string[];
	includeReviewState: boolean;
};

type ImportDataOptions = {
	importReviewState: boolean;
};

export type ImportDataSummary = {
	cardPacks: number;
	cards: number;
	reviewEvents: number;
	schedulingStates: number;
};

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

function hasProfileOwnership(
	record: {
		account_user_id?: string;
		profile_id?: string;
		owner_user_id: string;
	},
	accountUserId: string,
	profileId: string,
): boolean {
	return (
		record.account_user_id === accountUserId &&
		record.profile_id === profileId &&
		record.owner_user_id === profileId
	);
}

function hasLearnerOwnership(
	record: {
		account_user_id?: string;
		learner_profile_id?: string;
		owner_user_id: string;
	},
	accountUserId: string,
	profileId: string,
): boolean {
	return (
		record.account_user_id === accountUserId &&
		record.learner_profile_id === profileId &&
		record.owner_user_id === profileId
	);
}

function listProfileOwnedRecords<S extends StoreName>(
	client: ApiClient,
	store: S,
	accountUserId: string,
	profileId: string,
	options: QueryOptions<StoreValue<S>>,
): Promise<StoreValue<S>[]> {
	return isFirestoreApiClient(client)
		? listFirestoreRecords(store, ownershipConstraints(accountUserId, profileId), options)
		: client.list(store, options);
}

async function listProfileOwnedRecordsByCardIds<
	S extends "card_mastery_state" | "review_event",
>(
	client: ApiClient,
	store: S,
	accountUserId: string,
	profileId: string,
	cardIds: string[],
	options: QueryOptions<StoreValue<S>>,
): Promise<StoreValue<S>[]> {
	if (!isFirestoreApiClient(client)) {
		return client.list(store, options);
	}

	const records = await Promise.all(
		chunkFirestoreInValues(cardIds).map((chunk) =>
			listFirestoreRecords(
				store,
				[
					...ownershipConstraints(accountUserId, profileId),
					where("card_id", "in", chunk),
				],
				options,
			),
		),
	);
	return records.flat();
}

async function listLearnerOwnedSchedulingStatesByCardIds(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardIds: string[],
	options: QueryOptions<CardSchedulingState>,
): Promise<CardSchedulingState[]> {
	if (!isFirestoreApiClient(client)) {
		return client.list("card_scheduling_state", options);
	}

	const records = await Promise.all(
		chunkFirestoreInValues(cardIds).map((chunk) =>
			listFirestoreRecords(
				"card_scheduling_state",
				[
					...learnerOwnershipConstraints(accountUserId, profileId),
					where("card_id", "in", chunk),
				],
				options,
			),
		),
	);
	return records.flat();
}

export async function buildCardMasterExport(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	options: BuildExportPayloadOptions,
): Promise<CardMasterExportPayload> {
	if (options.cardPackIds.length === 0) {
		throw new Error("Select at least one card pack to export.");
	}

	const selectedPackIds = new Set(options.cardPackIds);
	const [packs, cards] = await Promise.all([
		listProfileOwnedRecords(client, "card_pack", accountUserId, profileId, {
			filter: (pack) =>
				hasProfileOwnership(pack, accountUserId, profileId) &&
				selectedPackIds.has(pack.id),
		}),
		listProfileOwnedRecords(client, "card", accountUserId, profileId, {
			filter: (card) =>
				hasProfileOwnership(card, accountUserId, profileId) &&
				selectedPackIds.has(card.card_pack_id),
		}),
	]);

	const payload: CardMasterExportPayload = {
		format: EXPORT_FORMAT,
		version: EXPORT_VERSION,
		exported_at: nowIso(),
		include_review_state: options.includeReviewState,
		packs,
		cards,
	};

	if (!options.includeReviewState) {
		return payload;
	}

	const cardIds = cards.map((card) => card.id);
	const cardIdSet = new Set(cardIds);
	const [schedulingStates, reviewEvents, masteryStates] = await Promise.all([
		listLearnerOwnedSchedulingStatesByCardIds(
			client,
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
			client,
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
			client,
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
					client,
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

export async function importCardMasterData(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	payload: CardMasterExportPayload,
	options: ImportDataOptions,
): Promise<ImportDataSummary> {
	const importedAt = nowIso();
	const packIdMap = new Map<string, string>();

	for (const pack of payload.packs) {
		const newPackId = generateId();
		packIdMap.set(pack.id, newPackId);
		const record: CardPack = {
			...withProfileOwnership(pack, accountUserId, profileId),
			id: newPackId,
		};
		await client.put("card_pack", record);
	}

	const cardIdMap = new Map<string, string>();
	const cardsToImport = payload.cards.filter((card) => packIdMap.has(card.card_pack_id));

	for (const card of cardsToImport) {
		const cardPackId = packIdMap.get(card.card_pack_id);
		if (!cardPackId) {
			continue;
		}

		const newCardId = generateId();
		cardIdMap.set(card.id, newCardId);
		const record: Card = {
			...withProfileOwnership(card, accountUserId, profileId),
			id: newCardId,
			card_pack_id: cardPackId,
		};
		await client.put("card", record);
	}

	let importedReviewEvents = 0;
	let importedSchedulingStates = 0;

	if (options.importReviewState && payload.review_state) {
		const reviewState = payload.review_state;
		const schedulingStatesToImport = reviewState.scheduling_states.filter((state) =>
			cardIdMap.has(state.card_id),
		);
		const profileIdSet = new Set(
			schedulingStatesToImport.map((state) => state.profile_id),
		);
		const profileIdMap = new Map<string, string>();
		const availableProfiles = new Map(
			reviewState.scheduling_profiles.map((profile) => [profile.id, profile]),
		);

		for (const sourceProfileId of profileIdSet) {
			const sourceProfile = availableProfiles.get(sourceProfileId);
			const newProfileId = generateId();
			profileIdMap.set(sourceProfileId, newProfileId);

			const profileRecord: SchedulingProfile = sourceProfile
				? {
						...withProfileOwnership(sourceProfile, accountUserId, profileId),
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
					};
			await client.put("scheduling_profile", profileRecord);
		}

		const reviewEventsToImport = reviewState.review_events.filter((event) =>
			cardIdMap.has(event.card_id),
		);
		const reviewEventIdMap = new Map<string, string>();

		for (const event of reviewEventsToImport) {
			const mappedCardId = cardIdMap.get(event.card_id);
			if (!mappedCardId) {
				continue;
			}

			const newEventId = generateId();
			reviewEventIdMap.set(event.id, newEventId);
			const record: ReviewEvent = {
				...withProfileOwnership(event, accountUserId, profileId),
				id: newEventId,
				card_id: mappedCardId,
			};
			await client.put("review_event", record);
			importedReviewEvents += 1;
		}

		for (const state of schedulingStatesToImport) {
			const mappedCardId = cardIdMap.get(state.card_id);
			const mappedProfileId = profileIdMap.get(state.profile_id);
			if (!mappedCardId || !mappedProfileId) {
				continue;
			}

			const record: CardSchedulingState = {
				...withLearnerOwnership(state, accountUserId, profileId),
				id: generateId(),
				card_id: mappedCardId,
				profile_id: mappedProfileId,
				last_event_id: state.last_event_id
					? reviewEventIdMap.get(state.last_event_id) ?? null
					: null,
			};
			await client.put("card_scheduling_state", record);
			importedSchedulingStates += 1;
		}

		const masteryStatesToImport = Array.isArray(reviewState.card_mastery_states)
			? reviewState.card_mastery_states.filter((state) => cardIdMap.has(state.card_id))
			: [];

		for (const state of masteryStatesToImport) {
			const mappedCardId = cardIdMap.get(state.card_id);
			if (!mappedCardId) {
				continue;
			}

			const record: CardMasteryState = {
				...withProfileOwnership(state, accountUserId, profileId),
				id: generateId(),
				card_id: mappedCardId,
			};
			await client.put("card_mastery_state", record);
		}
	}

	return {
		cardPacks: payload.packs.length,
		cards: cardIdMap.size,
		reviewEvents: importedReviewEvents,
		schedulingStates: importedSchedulingStates,
	};
}
