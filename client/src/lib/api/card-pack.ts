import type { ApiClient } from "./client";
import type { CardPackInsert, CardPackUpdate } from "./dtos/card-pack";
import type { CardPack } from "./entities/card-pack";
import { generateId, nowIso } from "./utils";

const DEFAULT_CARD_PACK: Pick<CardPackInsert, "status"> = {
	status: "active",
};

type CreateCardPackInput = Omit<CardPackInsert, "owner_user_id" | "status"> &
	Partial<Pick<CardPackInsert, "status">>;

export type CardPackWithCounts = CardPack & {
	cards_count: number;
};

export async function listCardPacks(
	client: ApiClient,
	ownerUserId: string,
): Promise<CardPack[]> {
	return client.list("card_pack", {
		filter: (pack) => pack.owner_user_id === ownerUserId,
		sortBy: (a, b) =>
			Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? ""),
	});
}

export async function listCardPacksWithCounts(
	client: ApiClient,
	ownerUserId: string,
): Promise<CardPackWithCounts[]> {
	const [cardPacks, cards] = await Promise.all([
		listCardPacks(client, ownerUserId),
		client.list("card", { filter: (card) => card.owner_user_id === ownerUserId }),
	]);

	const countsMap = new Map<string, number>();

	for (const card of cards) {
		countsMap.set(card.card_pack_id, (countsMap.get(card.card_pack_id) ?? 0) + 1);
	}

	return cardPacks.map((pack) => ({
		...pack,
		cards_count: countsMap.get(pack.id) ?? 0,
	}));
}

export async function getCardPackById(
	client: ApiClient,
	cardPackId: string,
	ownerUserId: string,
): Promise<CardPack | null> {
	const pack = await client.get("card_pack", cardPackId);
	if (!pack || pack.owner_user_id !== ownerUserId) return null;
	return pack;
}

export async function createCardPack(
	client: ApiClient,
	ownerUserId: string,
	input: CreateCardPackInput,
): Promise<CardPack> {
	const now = nowIso();
	const payload: CardPackInsert = {
		...DEFAULT_CARD_PACK,
		...input,
		owner_user_id: ownerUserId,
		updated_at: null,
	};

	const record: CardPack = {
		id: generateId(),
		name: payload.name,
		owner_user_id: payload.owner_user_id,
		status: payload.status ?? DEFAULT_CARD_PACK.status,
		created_at: now,
		updated_at: payload.updated_at ?? null,
	};

	await client.put("card_pack", record);
	return record;
}

export async function updateCardPack(
	client: ApiClient,
	cardPackId: string,
	ownerUserId: string,
	updates: CardPackUpdate,
): Promise<CardPack | null> {
	const existing = await getCardPackById(client, cardPackId, ownerUserId);
	if (!existing) return null;

	const updated: CardPack = {
		...existing,
		...updates,
		updated_at: nowIso(),
	};

	await client.put("card_pack", updated);
	return updated;
}

export async function deleteCardPack(
	client: ApiClient,
	cardPackId: string,
	ownerUserId: string,
): Promise<void> {
	const pack = await getCardPackById(client, cardPackId, ownerUserId);
	if (!pack) return;
	await client.delete("card_pack", cardPackId);
}
