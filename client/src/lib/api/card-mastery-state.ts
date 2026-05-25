import type { ApiClient, QueryOptions } from "./client";
import { where } from "firebase/firestore";
import type {
	CardMasteryStateInsert,
	CardMasteryStateUpdate,
} from "./dtos/card-mastery-state";
import type { CardMasteryState } from "./entities/card-mastery-state";
import {
	chunkFirestoreInValues,
	isFirestoreApiClient,
	listFirestoreRecords,
	ownedStoreCacheKey,
	ownershipConstraints,
} from "./firestore-client";
import { hasCloudOwnership } from "./ownership";
import { generateId, nowIso } from "./utils";

function clampScore(score: unknown): number {
	if (typeof score !== "number" || Number.isNaN(score)) return 0;
	return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeMasteryStateValue(value: unknown): CardMasteryState["mastery_state"] {
	switch (value) {
		case "learning":
		case "graduated":
		case "reviewing":
		case "mastered":
			return value;
		default:
			return "unseen";
	}
}

export function normalizeCardMasteryState(record: CardMasteryState): CardMasteryState {
	return {
		...record,
		mastery_score: clampScore(record.mastery_score),
		mastery_state: normalizeMasteryStateValue(record.mastery_state),
		easy_streak:
			typeof record.easy_streak === "number" && record.easy_streak > 0
				? Math.floor(record.easy_streak)
				: 0,
		recent_outcomes: Array.isArray(record.recent_outcomes)
			? record.recent_outcomes.map((item) => Boolean(item))
			: [],
		updated_at: typeof record.updated_at === "string" ? record.updated_at : nowIso(),
	};
}

type LegacyCardMasteryStateInsert = Omit<
	CardMasteryStateInsert,
	"account_user_id" | "profile_id"
> & {
	account_user_id?: string;
	profile_id?: string;
};

function hasLegacyOwnership(
	record: Pick<CardMasteryState, "owner_user_id">,
	ownerUserId: string,
): boolean {
	return record.owner_user_id === ownerUserId;
}

export function listMasteryStatesByCardIds(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardIds: string[],
): Promise<CardMasteryState[]>;
export function listMasteryStatesByCardIds(
	client: ApiClient,
	ownerUserId: string,
	cardIds: string[],
): Promise<CardMasteryState[]>;
export async function listMasteryStatesByCardIds(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileIdOrCardIds: string | string[],
	maybeCardIds?: string[],
): Promise<CardMasteryState[]> {
	const isCloudScoped = typeof profileIdOrCardIds === "string";
	const profileId = isCloudScoped ? profileIdOrCardIds : null;
	const cardIds = isCloudScoped ? maybeCardIds ?? [] : profileIdOrCardIds;
	if (cardIds.length === 0) return [];
	const cardIdSet = new Set(cardIds);
	const options: QueryOptions<CardMasteryState> = {
		filter: (state) =>
			(profileId
				? hasCloudOwnership(state, accountUserIdOrOwnerUserId, profileId)
				: hasLegacyOwnership(state, accountUserIdOrOwnerUserId)) &&
			cardIdSet.has(state.card_id),
	};
	const records =
		profileId && isFirestoreApiClient(client)
			? (
					await Promise.all(
						chunkFirestoreInValues(cardIds).map((chunk) =>
							listFirestoreRecords(
								"card_mastery_state",
								[
									...ownershipConstraints(accountUserIdOrOwnerUserId, profileId),
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
					)
				).flat()
			: await client.list("card_mastery_state", options);
	return records.map((record) => normalizeCardMasteryState(record));
}

export function getMasteryStateByCardId(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardId: string,
): Promise<CardMasteryState | null>;
export function getMasteryStateByCardId(
	client: ApiClient,
	ownerUserId: string,
	cardId: string,
): Promise<CardMasteryState | null>;
export async function getMasteryStateByCardId(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileIdOrCardId: string,
	maybeCardId?: string,
): Promise<CardMasteryState | null> {
	const states = maybeCardId
		? await listMasteryStatesByCardIds(
				client,
				accountUserIdOrOwnerUserId,
				profileIdOrCardId,
				[maybeCardId],
			)
		: await listMasteryStatesByCardIds(client, accountUserIdOrOwnerUserId, [
				profileIdOrCardId,
			]);
	return states[0] ? normalizeCardMasteryState(states[0]) : null;
}

export async function insertMasteryState(
	client: ApiClient,
	input: CardMasteryStateInsert | LegacyCardMasteryStateInsert,
): Promise<CardMasteryState> {
	const timestamp = nowIso();
	const record: CardMasteryState = normalizeCardMasteryState({
		id: generateId(),
		account_user_id: input.account_user_id,
		profile_id: input.profile_id,
		owner_user_id: input.owner_user_id,
		card_id: input.card_id,
		mastery_score: input.mastery_score,
		mastery_state: input.mastery_state,
		easy_streak: input.easy_streak,
		recent_outcomes: input.recent_outcomes,
		created_at: timestamp,
		updated_at: timestamp,
	});

	await client.put("card_mastery_state", record);
	return record;
}

export function updateMasteryState(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	stateId: string,
	updates: CardMasteryStateUpdate,
): Promise<CardMasteryState | null>;
export function updateMasteryState(
	client: ApiClient,
	stateId: string,
	ownerUserId: string,
	updates: CardMasteryStateUpdate,
): Promise<CardMasteryState | null>;
export async function updateMasteryState(
	client: ApiClient,
	firstId: string,
	secondId: string,
	thirdIdOrUpdates: string | CardMasteryStateUpdate,
	maybeUpdates?: CardMasteryStateUpdate,
): Promise<CardMasteryState | null> {
	const isCloudScoped = typeof thirdIdOrUpdates === "string";
	const stateId = isCloudScoped ? thirdIdOrUpdates : firstId;
	const existing = await client.get("card_mastery_state", stateId);
	if (!existing) return null;
	if (isCloudScoped) {
		if (!hasCloudOwnership(existing, firstId, secondId)) return null;
	} else if (!hasLegacyOwnership(existing, secondId)) {
		return null;
	}

	const updated: CardMasteryState = normalizeCardMasteryState({
		...existing,
		...((isCloudScoped ? maybeUpdates : thirdIdOrUpdates) ?? {}),
		updated_at: nowIso(),
	});

	await client.put("card_mastery_state", updated);
	return updated;
}

export function upsertMasteryState(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	existing: CardMasteryState | null,
	input: CardMasteryStateInsert,
): Promise<CardMasteryState>;
export function upsertMasteryState(
	client: ApiClient,
	existing: CardMasteryState | null,
	input: CardMasteryStateInsert | LegacyCardMasteryStateInsert,
): Promise<CardMasteryState>;
export async function upsertMasteryState(
	client: ApiClient,
	firstArg: string | CardMasteryState | null,
	secondArg: string | CardMasteryStateInsert | LegacyCardMasteryStateInsert,
	thirdArg?: CardMasteryState | null,
	fourthArg?: CardMasteryStateInsert,
): Promise<CardMasteryState> {
	const isCloudScoped = typeof firstArg === "string";
	const existing = isCloudScoped ? thirdArg ?? null : firstArg;
	const input = isCloudScoped ? fourthArg : secondArg;
	if (!input || typeof input === "string") {
		throw new Error("Mastery state input is required");
	}
	if (existing) {
		const updates = {
			mastery_score: input.mastery_score,
			mastery_state: input.mastery_state,
			easy_streak: input.easy_streak,
			recent_outcomes: input.recent_outcomes,
		};
		const updated = isCloudScoped
			? await updateMasteryState(
					client,
					firstArg,
					secondArg as string,
					existing.id,
					updates,
				)
			: await updateMasteryState(client, existing.id, existing.owner_user_id, updates);
		return updated
			? normalizeCardMasteryState(updated)
			: normalizeCardMasteryState({ ...existing, ...input, updated_at: nowIso() });
	}

	return insertMasteryState(client, input);
}
