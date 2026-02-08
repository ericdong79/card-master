import type { ApiClient } from "./client";
import type { Card } from "./entities/card";
import type { CardPack } from "./entities/card-pack";
import type { CardSchedulingState } from "./entities/card-scheduling-state";
import type { ReviewEvent } from "./entities/review-event";
import type { SchedulingProfile } from "./entities/scheduling-profile";
import { generateId, nowIso } from "./utils";

const EXPORT_FORMAT = "card-master-export";
const EXPORT_VERSION = 1;

type ExportReviewState = {
	scheduling_profiles: SchedulingProfile[];
	scheduling_states: CardSchedulingState[];
	review_events: ReviewEvent[];
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
}

export async function buildCardMasterExport(
	client: ApiClient,
	ownerUserId: string,
	options: BuildExportPayloadOptions,
): Promise<CardMasterExportPayload> {
	if (options.cardPackIds.length === 0) {
		throw new Error("Select at least one card pack to export.");
	}

	const selectedPackIds = new Set(options.cardPackIds);
	const [packs, cards] = await Promise.all([
		client.list("card_pack", {
			filter: (pack) =>
				pack.owner_user_id === ownerUserId && selectedPackIds.has(pack.id),
		}),
		client.list("card", {
			filter: (card) =>
				card.owner_user_id === ownerUserId && selectedPackIds.has(card.card_pack_id),
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

	const cardIdSet = new Set(cards.map((card) => card.id));
	const [schedulingStates, reviewEvents] = await Promise.all([
		client.list("card_scheduling_state", {
			filter: (state) =>
				state.owner_user_id === ownerUserId && cardIdSet.has(state.card_id),
		}),
		client.list("review_event", {
			filter: (event) =>
				event.owner_user_id === ownerUserId && cardIdSet.has(event.card_id),
		}),
	]);

	const profileIdSet = new Set(schedulingStates.map((state) => state.profile_id));
	const schedulingProfiles =
		profileIdSet.size === 0
			? []
			: await client.list("scheduling_profile", {
					filter: (profile) =>
						profile.owner_user_id === ownerUserId &&
						profileIdSet.has(profile.id),
				});

	payload.review_state = {
		scheduling_profiles: schedulingProfiles,
		scheduling_states: schedulingStates,
		review_events: reviewEvents,
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
	ownerUserId: string,
	payload: CardMasterExportPayload,
	options: ImportDataOptions,
): Promise<ImportDataSummary> {
	const importedAt = nowIso();
	const packIdMap = new Map<string, string>();

	for (const pack of payload.packs) {
		const newPackId = generateId();
		packIdMap.set(pack.id, newPackId);
		const record: CardPack = {
			...pack,
			id: newPackId,
			owner_user_id: ownerUserId,
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
			...card,
			id: newCardId,
			card_pack_id: cardPackId,
			owner_user_id: ownerUserId,
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
						...sourceProfile,
						id: newProfileId,
						owner_user_id: ownerUserId,
					}
				: {
						id: newProfileId,
						owner_user_id: ownerUserId,
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
				...event,
				id: newEventId,
				card_id: mappedCardId,
				owner_user_id: ownerUserId,
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
				...state,
				id: generateId(),
				card_id: mappedCardId,
				profile_id: mappedProfileId,
				owner_user_id: ownerUserId,
				last_event_id: state.last_event_id
					? reviewEventIdMap.get(state.last_event_id) ?? null
					: null,
			};
			await client.put("card_scheduling_state", record);
			importedSchedulingStates += 1;
		}
	}

	return {
		cardPacks: payload.packs.length,
		cards: cardIdMap.size,
		reviewEvents: importedReviewEvents,
		schedulingStates: importedSchedulingStates,
	};
}
