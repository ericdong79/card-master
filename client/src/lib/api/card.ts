import type { ApiClient } from "./client";
import type { CardInsert, CardUpdate } from "./dtos/card";
import type { Card, CardStatus } from "./entities/card";
import { generateId, nowIso } from "./utils";

const DEFAULT_CARD: Pick<CardInsert, "status"> = {
	status: "active",
};

type CreateCardInput = Omit<CardInsert, "owner_user_id" | "status"> &
	Partial<Pick<CardInsert, "status">>;

type CardListFilters = {
	cardPackId?: string;
	status?: CardStatus;
};

export async function listCards(
	client: ApiClient,
	ownerUserId: string,
	filters: CardListFilters = {},
): Promise<Card[]> {
	return client.list("card", {
		filter: (card) => {
			if (card.owner_user_id !== ownerUserId) return false;
			if (filters.cardPackId && card.card_pack_id !== filters.cardPackId)
				return false;
			if (filters.status && card.status !== filters.status) return false;
			return true;
		},
		sortBy: (a, b) =>
			Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? ""),
	});
}

export async function getCardById(
	client: ApiClient,
	cardId: string,
	ownerUserId: string,
): Promise<Card | null> {
	const card = await client.get("card", cardId);
	if (!card || card.owner_user_id !== ownerUserId) return null;
	return card;
}

export async function createCard(
	client: ApiClient,
	ownerUserId: string,
	input: CreateCardInput,
): Promise<Card> {
	const now = nowIso();
	const payload: CardInsert = {
		...DEFAULT_CARD,
		...input,
		owner_user_id: ownerUserId,
		updated_at: null,
	};

	const record: Card = {
		id: generateId(),
		card_pack_id: payload.card_pack_id,
		owner_user_id: payload.owner_user_id,
		prompt: payload.prompt,
		answer: payload.answer,
		status: payload.status ?? DEFAULT_CARD.status,
		created_at: now,
		updated_at: payload.updated_at ?? null,
	};

	await client.put("card", record);
	return record;
}

export async function updateCard(
	client: ApiClient,
	cardId: string,
	ownerUserId: string,
	updates: CardUpdate,
): Promise<Card> {
	const existing = await getCardById(client, cardId, ownerUserId);
	if (!existing) {
		throw new Error("Card not found");
	}

	const updated: Card = {
		...existing,
		...updates,
		updated_at: nowIso(),
	};

	await client.put("card", updated);
	return updated;
}

export async function deleteCard(
	client: ApiClient,
	cardId: string,
	ownerUserId: string,
): Promise<void> {
	const card = await getCardById(client, cardId, ownerUserId);
	if (!card) return;
	await client.delete("card", cardId);
}
