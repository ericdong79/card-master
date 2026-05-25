import type { ApiClient, QueryOptions } from "./client";
import { where } from "firebase/firestore";
import type {
	CardSchedulingStateInsert,
	CardSchedulingStateUpdate,
} from "./dtos/card-scheduling-state";
import type { CardSchedulingState } from "./entities/card-scheduling-state";
import {
	chunkFirestoreInValues,
	isFirestoreApiClient,
	learnerOwnershipConstraints,
	listFirestoreRecords,
	ownedStoreCacheKey,
} from "./firestore-client";
import { generateId, nowIso } from "./utils";

type LegacyCardSchedulingStateInsert = Omit<
	CardSchedulingStateInsert,
	"account_user_id" | "learner_profile_id"
> & {
	account_user_id?: string;
	learner_profile_id?: string;
};

function hasLearnerOwnership(
	record: Pick<
		CardSchedulingState,
		"account_user_id" | "learner_profile_id" | "owner_user_id"
	>,
	accountUserId: string,
	profileId: string,
): boolean {
	return (
		record.account_user_id === accountUserId &&
		record.learner_profile_id === profileId &&
		record.owner_user_id === profileId
	);
}

function hasLegacyOwnership(
	record: Pick<CardSchedulingState, "owner_user_id">,
	ownerUserId: string,
): boolean {
	return record.owner_user_id === ownerUserId;
}

export function listSchedulingStatesByCardIds(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardIds: string[],
): Promise<CardSchedulingState[]>;
export function listSchedulingStatesByCardIds(
	client: ApiClient,
	ownerUserId: string,
	cardIds: string[],
): Promise<CardSchedulingState[]>;
export async function listSchedulingStatesByCardIds(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileIdOrCardIds: string | string[],
	maybeCardIds?: string[],
): Promise<CardSchedulingState[]> {
	const isCloudScoped = typeof profileIdOrCardIds === "string";
	const profileId = isCloudScoped ? profileIdOrCardIds : null;
	const cardIds = isCloudScoped ? maybeCardIds ?? [] : profileIdOrCardIds;
	if (cardIds.length === 0) return [];
	const cardIdSet = new Set(cardIds);
	const options: QueryOptions<CardSchedulingState> = {
		filter: (state) =>
			(profileId
				? hasLearnerOwnership(state, accountUserIdOrOwnerUserId, profileId)
				: hasLegacyOwnership(state, accountUserIdOrOwnerUserId)) &&
			cardIdSet.has(state.card_id),
	};

	if (profileId && isFirestoreApiClient(client)) {
		const chunks = chunkFirestoreInValues(cardIds);
		const records = await Promise.all(
			chunks.map((chunk) =>
				listFirestoreRecords(
					"card_scheduling_state",
					[
						...learnerOwnershipConstraints(accountUserIdOrOwnerUserId, profileId),
						where("card_id", "in", chunk),
					],
					{
						...options,
						cacheKey: ownedStoreCacheKey(
							accountUserIdOrOwnerUserId,
							profileId,
							`cards:${chunk.join(",")}`,
						),
					},
				),
			),
		);
		return records.flat();
	}

	return client.list("card_scheduling_state", options);
}

export async function insertSchedulingState(
	client: ApiClient,
	input: CardSchedulingStateInsert | LegacyCardSchedulingStateInsert,
): Promise<CardSchedulingState> {
	const record: CardSchedulingState = {
		id: generateId(),
		account_user_id: input.account_user_id,
		learner_profile_id: input.learner_profile_id,
		owner_user_id: input.owner_user_id,
		card_id: input.card_id,
		profile_id: input.profile_id,
		due_at: input.due_at,
		state: input.state,
		last_reviewed_at: input.last_reviewed_at,
		last_event_id: input.last_event_id ?? null,
		created_at: nowIso(),
	};

	await client.put("card_scheduling_state", record);
	return record;
}

export function updateSchedulingState(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	stateId: string,
	updates: CardSchedulingStateUpdate,
): Promise<CardSchedulingState | null>;
export function updateSchedulingState(
	client: ApiClient,
	stateId: string,
	ownerUserId: string,
	updates: CardSchedulingStateUpdate,
): Promise<CardSchedulingState | null>;
export async function updateSchedulingState(
	client: ApiClient,
	firstId: string,
	secondId: string,
	thirdIdOrUpdates: string | CardSchedulingStateUpdate,
	maybeUpdates?: CardSchedulingStateUpdate,
): Promise<CardSchedulingState | null> {
	const isCloudScoped = typeof thirdIdOrUpdates === "string";
	const stateId = isCloudScoped ? thirdIdOrUpdates : firstId;
	const existing = await client.get("card_scheduling_state", stateId);
	if (!existing) return null;
	if (isCloudScoped) {
		if (!hasLearnerOwnership(existing, firstId, secondId)) return null;
	} else if (!hasLegacyOwnership(existing, secondId)) {
		return null;
	}

	const updated: CardSchedulingState = {
		...existing,
		...((isCloudScoped ? maybeUpdates : thirdIdOrUpdates) ?? {}),
	};

	await client.put("card_scheduling_state", updated);
	return updated;
}

export function upsertSchedulingState(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	existing: CardSchedulingState | null,
	input: CardSchedulingStateInsert,
): Promise<CardSchedulingState>;
export function upsertSchedulingState(
	client: ApiClient,
	existing: CardSchedulingState | null,
	input: CardSchedulingStateInsert | LegacyCardSchedulingStateInsert,
): Promise<CardSchedulingState>;
export async function upsertSchedulingState(
	client: ApiClient,
	firstArg: string | CardSchedulingState | null,
	secondArg: string | CardSchedulingStateInsert | LegacyCardSchedulingStateInsert,
	thirdArg?: CardSchedulingState | null,
	fourthArg?: CardSchedulingStateInsert,
): Promise<CardSchedulingState> {
	const isCloudScoped = typeof firstArg === "string";
	const existing = isCloudScoped ? thirdArg ?? null : firstArg;
	const input = isCloudScoped ? fourthArg : secondArg;
	if (!input || typeof input === "string") {
		throw new Error("Scheduling state input is required");
	}
	if (existing) {
		const updated: CardSchedulingState = {
			...existing,
			...input,
		};
		await client.put("card_scheduling_state", updated);
		return updated;
	}

	return insertSchedulingState(client, input);
}
