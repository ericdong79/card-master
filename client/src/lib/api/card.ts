import type { ApiClient, QueryOptions } from "./client";
import type { CardInsert, CardUpdate } from "./dtos/card";
import type { Card, CardStatus } from "./entities/card";
import {
	isFirestoreApiClient,
	listFirestoreRecords,
	ownedStoreCacheKey,
	ownershipConstraints,
} from "./firestore-client";
import { createCloudOwnership, hasCloudOwnership } from "./ownership";
import { generateId, nowIso } from "./utils";

const DEFAULT_CARD: Pick<CardInsert, "status"> = {
	status: "active",
};

type CreateCardInput = Omit<
	CardInsert,
	"account_user_id" | "profile_id" | "owner_user_id" | "status"
> &
	Partial<Pick<CardInsert, "status">>;

type CardListFilters = {
	cardPackId?: string;
	status?: CardStatus;
};

function hasLegacyOwnership(
	record: Pick<Card, "owner_user_id">,
	ownerUserId: string,
): boolean {
	return record.owner_user_id === ownerUserId;
}

export function listCards(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	filters?: CardListFilters,
): Promise<Card[]>;
export function listCards(
	client: ApiClient,
	ownerUserId: string,
	filters?: CardListFilters,
): Promise<Card[]>;
export async function listCards(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileIdOrFilters: string | CardListFilters = {},
	maybeFilters: CardListFilters = {},
): Promise<Card[]> {
	const isCloudScoped = typeof profileIdOrFilters === "string";
	const profileId = isCloudScoped ? profileIdOrFilters : null;
	const filters = isCloudScoped ? maybeFilters : profileIdOrFilters;
	const options: QueryOptions<Card> = {
		filter: (card) => {
			if (
				profileId
					? !hasCloudOwnership(card, accountUserIdOrOwnerUserId, profileId)
					: !hasLegacyOwnership(card, accountUserIdOrOwnerUserId)
			) {
				return false;
			}
			if (filters.cardPackId && card.card_pack_id !== filters.cardPackId)
				return false;
			if (filters.status && card.status !== filters.status) return false;
			return true;
		},
		sortBy: (a, b) =>
			Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? ""),
		cacheKey: profileId
			? ownedStoreCacheKey(accountUserIdOrOwnerUserId, profileId)
			: undefined,
	};

	if (profileId && isFirestoreApiClient(client)) {
		return listFirestoreRecords(
			"card",
			ownershipConstraints(accountUserIdOrOwnerUserId, profileId),
			options,
		);
	}

	return client.list("card", options);
}

export function getCardById(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardId: string,
): Promise<Card | null>;
export function getCardById(
	client: ApiClient,
	cardId: string,
	ownerUserId: string,
): Promise<Card | null>;
export async function getCardById(
	client: ApiClient,
	firstId: string,
	secondId: string,
	thirdId?: string,
): Promise<Card | null> {
	const isCloudScoped = thirdId !== undefined;
	const cardId = isCloudScoped ? thirdId : firstId;
	const card = await client.get("card", cardId);
	if (!card) return null;
	if (isCloudScoped) {
		if (!hasCloudOwnership(card, firstId, secondId)) return null;
	} else if (!hasLegacyOwnership(card, secondId)) {
		return null;
	}
	return card;
}

export function createCard(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	input: CreateCardInput,
): Promise<Card>;
export function createCard(
	client: ApiClient,
	ownerUserId: string,
	input: CreateCardInput,
): Promise<Card>;
export async function createCard(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileIdOrInput: string | CreateCardInput,
	maybeInput?: CreateCardInput,
): Promise<Card> {
	const now = nowIso();
	const profileId =
		typeof profileIdOrInput === "string" ? profileIdOrInput : accountUserIdOrOwnerUserId;
	const input = typeof profileIdOrInput === "string" ? maybeInput : profileIdOrInput;
	if (!input) {
		throw new Error("Card input is required");
	}
	const payload: CardInsert = {
		...DEFAULT_CARD,
		...input,
		...createCloudOwnership(accountUserIdOrOwnerUserId, profileId),
		updated_at: null,
	};

	const record: Card = {
		id: generateId(),
		card_pack_id: payload.card_pack_id,
		account_user_id: payload.account_user_id,
		profile_id: payload.profile_id,
		owner_user_id: payload.owner_user_id,
		prompt: payload.prompt,
		answer: payload.answer,
		question_content: payload.question_content ?? null,
		answer_content: payload.answer_content ?? null,
		status: payload.status ?? DEFAULT_CARD.status,
		created_at: now,
		updated_at: payload.updated_at ?? null,
	};

	await client.put("card", record);
	return record;
}

export function updateCard(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardId: string,
	updates: CardUpdate,
): Promise<Card>;
export function updateCard(
	client: ApiClient,
	cardId: string,
	ownerUserId: string,
	updates: CardUpdate,
): Promise<Card>;
export async function updateCard(
	client: ApiClient,
	firstId: string,
	secondId: string,
	thirdIdOrUpdates: string | CardUpdate,
	maybeUpdates?: CardUpdate,
): Promise<Card> {
	const isCloudScoped = typeof thirdIdOrUpdates === "string";
	const existing = isCloudScoped
		? await getCardById(client, firstId, secondId, thirdIdOrUpdates)
		: await getCardById(client, firstId, secondId);
	if (!existing) {
		throw new Error("Card not found");
	}

	const updated: Card = {
		...existing,
		...((isCloudScoped ? maybeUpdates : thirdIdOrUpdates) ?? {}),
		updated_at: nowIso(),
	};

	await client.put("card", updated);
	return updated;
}

export function deleteCard(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardId: string,
): Promise<void>;
export function deleteCard(
	client: ApiClient,
	cardId: string,
	ownerUserId: string,
): Promise<void>;
export async function deleteCard(
	client: ApiClient,
	firstId: string,
	secondId: string,
	thirdId?: string,
): Promise<void> {
	const card = thirdId
		? await getCardById(client, firstId, secondId, thirdId)
		: await getCardById(client, firstId, secondId);
	if (!card) return;
	await client.delete("card", card.id);
}
