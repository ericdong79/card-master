import type { CloudUserProfile } from "@/features/profile/profile-repository";
import { saveCloudProfile } from "@/features/profile/profile-repository";
import {
	loadLocalProfileState,
	type StoredProfileState,
} from "@/features/profile/local-profile-store";
import type { ApiClient } from "@/lib/api/client";
import { createApiClient } from "@/lib/api/client";
import { createIndexedDbApiClient } from "@/lib/api/indexeddb-client";
import type { Card } from "@/lib/api/entities/card";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import { nowIso } from "@/lib/api/utils";
import { createLocalImportRepository } from "@/lib/data/repositories/local-import-repository";

export type LocalDataImportCounts = {
	profiles: number;
	cardPacks: number;
	cards: number;
	schedulingProfiles: number;
	schedulingStates: number;
	reviewEvents: number;
	cardMasteryStates: number;
};

export type LocalDataImportSource = {
	profileState: StoredProfileState;
	cardPacks: CardPack[];
	cards: Card[];
	schedulingProfiles: SchedulingProfile[];
	schedulingStates: CardSchedulingState[];
	reviewEvents: ReviewEvent[];
	cardMasteryStates: CardMasteryState[];
};

type ImportMetadata = {
	imported_from: "local_legacy";
	imported_at: string;
	source_id: string;
};

type Imported<T> = T & {
	import_metadata?: ImportMetadata;
};

export type LocalDataImportPlan = {
	accountUserId: string;
	sourceFingerprint: string;
	counts: LocalDataImportCounts;
	profileIdMap: Map<string, string>;
	cardPackIdMap: Map<string, string>;
	cardIdMap: Map<string, string>;
	schedulingProfileIdMap: Map<string, string>;
	reviewEventIdMap: Map<string, string>;
	profiles: Imported<CloudUserProfile>[];
	cardPacks: Imported<CardPack>[];
	cards: Imported<Card>[];
	schedulingProfiles: Imported<SchedulingProfile>[];
	schedulingStates: Imported<CardSchedulingState>[];
	reviewEvents: Imported<ReviewEvent>[];
	cardMasteryStates: Imported<CardMasteryState>[];
};

export type LocalDataImportStatus = "imported" | "already_imported";

export type LocalDataImportSummary = LocalDataImportCounts & {
	status: LocalDataImportStatus;
	sourceFingerprint: string;
	completedAt: string;
};

export type LocalDataImportCompletionMarker = {
	version: 1;
	account_user_id: string;
	source_fingerprint: string;
	counts: LocalDataImportCounts;
	completed_at: string;
};

export type LocalDataImportInspection = {
	counts: LocalDataImportCounts;
	sourceFingerprint: string | null;
	completedMarker: LocalDataImportCompletionMarker | null;
};

const IMPORT_COMPLETION_STORAGE_PREFIX =
	"card-master.local-import.completed.v1";

function emptyCounts(): LocalDataImportCounts {
	return {
		profiles: 0,
		cardPacks: 0,
		cards: 0,
		schedulingProfiles: 0,
		schedulingStates: 0,
		reviewEvents: 0,
		cardMasteryStates: 0,
	};
}

export function countLocalDataImportSource(
	source: LocalDataImportSource,
): LocalDataImportCounts {
	return {
		profiles: source.profileState.profiles.length,
		cardPacks: source.cardPacks.length,
		cards: source.cards.length,
		schedulingProfiles: source.schedulingProfiles.length,
		schedulingStates: source.schedulingStates.length,
		reviewEvents: source.reviewEvents.length,
		cardMasteryStates: source.cardMasteryStates.length,
	};
}

export function hasImportableLocalData(counts: LocalDataImportCounts): boolean {
	return Object.values(counts).some((count) => count > 0);
}

function createImportMetadata(sourceId: string, importedAt: string): ImportMetadata {
	return {
		imported_from: "local_legacy",
		imported_at: importedAt,
		source_id: sourceId,
	};
}

function stableHash(input: string): string {
	let hash = 5381;
	for (let index = 0; index < input.length; index += 1) {
		hash = (hash * 33) ^ input.charCodeAt(index);
	}
	return (hash >>> 0).toString(36);
}

function encodeImportDocumentIdPart(value: string): string {
	return encodeURIComponent(value);
}

function createImportDocumentId(
	accountUserId: string,
	entityType: string,
	sourceId: string,
): string {
	return [
		"import_v2",
		accountUserId,
		"local_legacy",
		entityType,
		sourceId,
	]
		.map(encodeImportDocumentIdPart)
		.join(":");
}

function createImportIdRegistry() {
	const idsByCollection = new Map<string, Map<string, string>>();

	return function reserveImportDocumentId(
		collection: string,
		id: string,
		sourceId: string,
	): string {
		const collectionIds = idsByCollection.get(collection) ?? new Map();
		idsByCollection.set(collection, collectionIds);

		if (collectionIds.has(id)) {
			const existingSourceId = collectionIds.get(id);
			throw new Error(
				`Duplicate import document id for ${collection}: ${id} maps both ${existingSourceId} and ${sourceId}`,
			);
		}

		collectionIds.set(id, sourceId);
		return id;
	};
}

function summarizeRecords<T extends { id: string }>(records: T[]) {
	return records
		.map((record) => {
			const value = record as Record<string, unknown>;
			return {
				id: value.id,
				owner_user_id: value.owner_user_id,
				profile_id: value.profile_id,
				learner_profile_id: value.learner_profile_id,
				card_pack_id: value.card_pack_id,
				card_id: value.card_id,
				created_at: value.created_at,
				updated_at: value.updated_at,
				reviewed_at: value.reviewed_at,
				due_at: value.due_at,
			};
		})
		.sort((left, right) =>
			String(left.id ?? "").localeCompare(String(right.id ?? "")),
		);
}

export function createLocalDataImportFingerprint(
	source: LocalDataImportSource,
): string {
	const summary = {
		counts: countLocalDataImportSource(source),
		profileState: {
			current_profile_id: source.profileState.current_profile_id,
			profiles: summarizeRecords(source.profileState.profiles),
		},
		cardPacks: summarizeRecords(source.cardPacks),
		cards: summarizeRecords(source.cards),
		schedulingProfiles: summarizeRecords(source.schedulingProfiles),
		schedulingStates: summarizeRecords(source.schedulingStates),
		reviewEvents: summarizeRecords(source.reviewEvents),
		cardMasteryStates: summarizeRecords(source.cardMasteryStates),
	};

	return `local-legacy:${stableHash(JSON.stringify(summary))}`;
}

function getImportCompletionStorageKey(
	accountUserId: string,
	sourceFingerprint: string,
): string {
	return `${IMPORT_COMPLETION_STORAGE_PREFIX}:${encodeURIComponent(
		accountUserId,
	)}:${sourceFingerprint}`;
}

function readImportCompletionMarker(
	accountUserId: string,
	sourceFingerprint: string,
): LocalDataImportCompletionMarker | null {
	if (typeof window === "undefined") return null;

	let storedValue: string | null = null;
	try {
		storedValue = window.localStorage.getItem(
			getImportCompletionStorageKey(accountUserId, sourceFingerprint),
		);
	} catch {
		return null;
	}
	if (!storedValue) return null;

	try {
		const marker = JSON.parse(storedValue) as LocalDataImportCompletionMarker;
		if (
			marker.version === 1 &&
			marker.account_user_id === accountUserId &&
			marker.source_fingerprint === sourceFingerprint
		) {
			return marker;
		}
	} catch {
		return null;
	}

	return null;
}

function writeImportCompletionMarker(marker: LocalDataImportCompletionMarker) {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.setItem(
			getImportCompletionStorageKey(
				marker.account_user_id,
				marker.source_fingerprint,
			),
			JSON.stringify(marker),
		);
	} catch {
		// Import IDs are deterministic, so losing the completion marker cannot
		// duplicate cloud records on retry.
	}
}

export function getCompletedLocalDataImportMarker(
	accountUserId: string,
	sourceFingerprint: string,
): LocalDataImportCompletionMarker | null {
	return readImportCompletionMarker(accountUserId, sourceFingerprint);
}

function withProfileOwnership<T extends { id: string; owner_user_id: string }>(
	record: T,
	accountUserId: string,
	profileId: string,
	importedAt: string,
): Imported<T & { account_user_id: string; profile_id: string }> {
	return {
		...record,
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
		import_metadata: createImportMetadata(record.id, importedAt),
	};
}

function withSchedulingStateOwnership(
	record: CardSchedulingState,
	accountUserId: string,
	learnerProfileId: string,
	schedulingProfileId: string,
	importedAt: string,
): Imported<CardSchedulingState> {
	return {
		...record,
		account_user_id: accountUserId,
		owner_user_id: learnerProfileId,
		learner_profile_id: learnerProfileId,
		profile_id: schedulingProfileId,
		import_metadata: createImportMetadata(record.id, importedAt),
	};
}

function mapOwnerProfileId(
	sourceProfileId: string | undefined,
	profileIdMap: Map<string, string>,
): string | null {
	if (!sourceProfileId) return null;
	return profileIdMap.get(sourceProfileId) ?? null;
}

export function createImportPlan(
	source: LocalDataImportSource,
	accountUserId: string,
	importedAt = nowIso(),
): LocalDataImportPlan {
	const sourceFingerprint = createLocalDataImportFingerprint(source);
	const reserveImportDocumentId = createImportIdRegistry();
	const profileIdMap = new Map<string, string>();
	const cardPackIdMap = new Map<string, string>();
	const cardIdMap = new Map<string, string>();
	const schedulingProfileIdMap = new Map<string, string>();
	const reviewEventIdMap = new Map<string, string>();

	for (const profile of source.profileState.profiles) {
		profileIdMap.set(
			profile.id,
			reserveImportDocumentId(
				"cloud_profile",
				createImportDocumentId(accountUserId, "profile", profile.id),
				profile.id,
			),
		);
	}

	const profiles: Imported<CloudUserProfile>[] = source.profileState.profiles.map(
		(profile) => {
			const mappedProfileId = profileIdMap.get(profile.id);
			if (!mappedProfileId) {
				throw new Error(`Missing profile mapping for ${profile.id}`);
			}
			return {
				...profile,
				id: mappedProfileId,
				account_user_id: accountUserId,
				import_metadata: createImportMetadata(profile.id, importedAt),
			};
		},
	);

	const cardPacks: Imported<CardPack>[] = [];
	for (const pack of source.cardPacks) {
		const mappedProfileId = mapOwnerProfileId(pack.owner_user_id, profileIdMap);
		if (!mappedProfileId) continue;

		const mappedPackId = createImportDocumentId(
			accountUserId,
			"card_pack",
			pack.id,
		);
		reserveImportDocumentId("card_pack", mappedPackId, pack.id);
		cardPackIdMap.set(pack.id, mappedPackId);
		cardPacks.push({
			...withProfileOwnership(pack, accountUserId, mappedProfileId, importedAt),
			id: mappedPackId,
		});
	}

	const cards: Imported<Card>[] = [];
	for (const card of source.cards) {
		const mappedProfileId = mapOwnerProfileId(card.owner_user_id, profileIdMap);
		const mappedPackId = cardPackIdMap.get(card.card_pack_id);
		if (!mappedProfileId || !mappedPackId) continue;

		const mappedCardId = createImportDocumentId(
			accountUserId,
			"card",
			card.id,
		);
		reserveImportDocumentId("card", mappedCardId, card.id);
		cardIdMap.set(card.id, mappedCardId);
		cards.push({
			...withProfileOwnership(card, accountUserId, mappedProfileId, importedAt),
			id: mappedCardId,
			card_pack_id: mappedPackId,
		});
	}

	const schedulingProfiles: Imported<SchedulingProfile>[] = [];
	for (const profile of source.schedulingProfiles) {
		const mappedLearnerProfileId = mapOwnerProfileId(
			profile.owner_user_id,
			profileIdMap,
		);
		if (!mappedLearnerProfileId) continue;

		const mappedSchedulingProfileId = createImportDocumentId(
			accountUserId,
			"scheduling_profile",
			profile.id,
		);
		reserveImportDocumentId(
			"scheduling_profile",
			mappedSchedulingProfileId,
			profile.id,
		);
		schedulingProfileIdMap.set(profile.id, mappedSchedulingProfileId);
		schedulingProfiles.push({
			...withProfileOwnership(
				profile,
				accountUserId,
				mappedLearnerProfileId,
				importedAt,
			),
			id: mappedSchedulingProfileId,
		});
	}

	const reviewEvents: Imported<ReviewEvent>[] = [];
	for (const event of source.reviewEvents) {
		const mappedProfileId = mapOwnerProfileId(event.owner_user_id, profileIdMap);
		const mappedCardId = cardIdMap.get(event.card_id);
		if (!mappedProfileId || !mappedCardId) continue;

		const mappedReviewEventId = createImportDocumentId(
			accountUserId,
			"review_event",
			event.id,
		);
		reserveImportDocumentId("review_event", mappedReviewEventId, event.id);
		reviewEventIdMap.set(event.id, mappedReviewEventId);
		reviewEvents.push({
			...withProfileOwnership(event, accountUserId, mappedProfileId, importedAt),
			id: mappedReviewEventId,
			card_id: mappedCardId,
		});
	}

	const schedulingStates: Imported<CardSchedulingState>[] = [];
	for (const state of source.schedulingStates) {
		const sourceLearnerProfileId = state.learner_profile_id ?? state.owner_user_id;
		const mappedLearnerProfileId = mapOwnerProfileId(
			sourceLearnerProfileId,
			profileIdMap,
		);
		const mappedCardId = cardIdMap.get(state.card_id);
		const mappedSchedulingProfileId = schedulingProfileIdMap.get(state.profile_id);
		if (!mappedLearnerProfileId || !mappedCardId || !mappedSchedulingProfileId) {
			continue;
		}

		schedulingStates.push({
			...withSchedulingStateOwnership(
				state,
				accountUserId,
				mappedLearnerProfileId,
				mappedSchedulingProfileId,
				importedAt,
			),
			id: reserveImportDocumentId(
				"card_scheduling_state",
				createImportDocumentId(
					accountUserId,
					"card_scheduling_state",
					state.id,
				),
				state.id,
			),
			card_id: mappedCardId,
			last_event_id: state.last_event_id
				? reviewEventIdMap.get(state.last_event_id) ?? null
				: null,
		});
	}

	const cardMasteryStates: Imported<CardMasteryState>[] = [];
	for (const state of source.cardMasteryStates) {
		const mappedProfileId = mapOwnerProfileId(state.owner_user_id, profileIdMap);
		const mappedCardId = cardIdMap.get(state.card_id);
		if (!mappedProfileId || !mappedCardId) continue;

		cardMasteryStates.push({
			...withProfileOwnership(state, accountUserId, mappedProfileId, importedAt),
			id: reserveImportDocumentId(
				"card_mastery_state",
				createImportDocumentId(accountUserId, "card_mastery_state", state.id),
				state.id,
			),
			card_id: mappedCardId,
		});
	}

	return {
		accountUserId,
		sourceFingerprint,
		counts: {
			profiles: profiles.length,
			cardPacks: cardPacks.length,
			cards: cards.length,
			schedulingProfiles: schedulingProfiles.length,
			schedulingStates: schedulingStates.length,
			reviewEvents: reviewEvents.length,
			cardMasteryStates: cardMasteryStates.length,
		},
		profileIdMap,
		cardPackIdMap,
		cardIdMap,
		schedulingProfileIdMap,
		reviewEventIdMap,
		profiles,
		cardPacks,
		cards,
		schedulingProfiles,
		schedulingStates,
		reviewEvents,
		cardMasteryStates,
	};
}

export async function readLocalDataImportSource(
	localClient: ApiClient = createIndexedDbApiClient(),
): Promise<LocalDataImportSource> {
	const profileState = loadLocalProfileState();
	const [
		cardPacks,
		cards,
		schedulingProfiles,
		schedulingStates,
		reviewEvents,
		cardMasteryStates,
	] = await Promise.all([
		localClient.list("card_pack"),
		localClient.list("card"),
		localClient.list("scheduling_profile"),
		localClient.list("card_scheduling_state"),
		localClient.list("review_event"),
		localClient.list("card_mastery_state"),
	]);

	return {
		profileState,
		cardPacks,
		cards,
		schedulingProfiles,
		schedulingStates,
		reviewEvents,
		cardMasteryStates,
	};
}

export async function getLocalDataImportCounts(): Promise<LocalDataImportCounts> {
	if (typeof window === "undefined" || typeof indexedDB === "undefined") {
		return emptyCounts();
	}

	try {
		return countLocalDataImportSource(await readLocalDataImportSource());
	} catch {
		return countLocalDataImportSource({
			profileState: loadLocalProfileState(),
			cardPacks: [],
			cards: [],
			schedulingProfiles: [],
			schedulingStates: [],
			reviewEvents: [],
			cardMasteryStates: [],
		});
	}
}

export async function inspectLocalDataImport(
	accountUserId: string | null,
): Promise<LocalDataImportInspection> {
	if (typeof window === "undefined" || typeof indexedDB === "undefined") {
		return {
			counts: emptyCounts(),
			sourceFingerprint: null,
			completedMarker: null,
		};
	}

	const source = await readLocalDataImportSource();
	const sourceFingerprint = createLocalDataImportFingerprint(source);
	return {
		counts: countLocalDataImportSource(source),
		sourceFingerprint,
		completedMarker: accountUserId
			? readImportCompletionMarker(accountUserId, sourceFingerprint)
			: null,
	};
}

export async function writeImportPlan(
	plan: LocalDataImportPlan,
	cloudClient: ApiClient = createApiClient(),
): Promise<LocalDataImportSummary> {
	const existingMarker = readImportCompletionMarker(
		plan.accountUserId,
		plan.sourceFingerprint,
	);
	if (existingMarker) {
		return {
			...existingMarker.counts,
			status: "already_imported",
			sourceFingerprint: existingMarker.source_fingerprint,
			completedAt: existingMarker.completed_at,
		};
	}

	for (const profile of plan.profiles) {
		await saveCloudProfile(profile);
	}

	await createLocalImportRepository({ client: cloudClient }).writePlannedRecords(
		plan,
	);

	const completedAt = nowIso();
	writeImportCompletionMarker({
		version: 1,
		account_user_id: plan.accountUserId,
		source_fingerprint: plan.sourceFingerprint,
		counts: plan.counts,
		completed_at: completedAt,
	});

	return {
		...plan.counts,
		status: "imported",
		sourceFingerprint: plan.sourceFingerprint,
		completedAt,
	};
}

export async function importLocalDataToCloud(
	accountUserId: string,
): Promise<LocalDataImportSummary> {
	const source = await readLocalDataImportSource();
	const plan = createImportPlan(source, accountUserId);
	return writeImportPlan(plan);
}
