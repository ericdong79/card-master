import type { ApiClient, QueryOptions } from "./client";
import type { CardPackInsert, CardPackUpdate } from "./dtos/card-pack";
import type { CardPack } from "./entities/card-pack";
import { DEFAULT_CARD_PACK_TYPE } from "./entities/card-pack";
import {
	isFirestoreApiClient,
	listFirestoreRecords,
	ownershipConstraints,
} from "./firestore-client";
import { listCards } from "./card";
import { createCloudOwnership, hasCloudOwnership } from "./ownership";
import { generateId, nowIso } from "./utils";

const DEFAULT_CARD_PACK: Pick<CardPackInsert, "status"> = {
	status: "active",
};

type CreateCardPackInput = Omit<
	CardPackInsert,
	"account_user_id" | "profile_id" | "owner_user_id" | "status"
> &
	Partial<Pick<CardPackInsert, "status">>;

export type CardPackWithCounts = CardPack & {
	cards_count: number;
};

function hasLegacyOwnership(
	record: Pick<CardPack, "owner_user_id">,
	ownerUserId: string,
): boolean {
	return record.owner_user_id === ownerUserId;
}

export function listCardPacks(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
): Promise<CardPack[]>;
export function listCardPacks(
	client: ApiClient,
	ownerUserId: string,
): Promise<CardPack[]>;
export async function listCardPacks(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileId?: string,
): Promise<CardPack[]> {
	const options: QueryOptions<CardPack> = {
		filter: (pack) =>
			profileId
				? hasCloudOwnership(pack, accountUserIdOrOwnerUserId, profileId)
				: hasLegacyOwnership(pack, accountUserIdOrOwnerUserId),
		sortBy: (a, b) =>
			Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? ""),
	};

	if (profileId && isFirestoreApiClient(client)) {
		return listFirestoreRecords(
			"card_pack",
			ownershipConstraints(accountUserIdOrOwnerUserId, profileId),
			options,
		);
	}

	return client.list("card_pack", options);
}

export function listCardPacksWithCounts(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
): Promise<CardPackWithCounts[]>;
export function listCardPacksWithCounts(
	client: ApiClient,
	ownerUserId: string,
): Promise<CardPackWithCounts[]>;
export async function listCardPacksWithCounts(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileId?: string,
): Promise<CardPackWithCounts[]> {
	const [cardPacks, cards] = await Promise.all([
		profileId
			? listCardPacks(client, accountUserIdOrOwnerUserId, profileId)
			: listCardPacks(client, accountUserIdOrOwnerUserId),
		profileId
			? listCards(client, accountUserIdOrOwnerUserId, profileId)
			: listCards(client, accountUserIdOrOwnerUserId),
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

export function getCardPackById(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardPackId: string,
): Promise<CardPack | null>;
export function getCardPackById(
	client: ApiClient,
	cardPackId: string,
	ownerUserId: string,
): Promise<CardPack | null>;
export async function getCardPackById(
	client: ApiClient,
	firstId: string,
	secondId: string,
	thirdId?: string,
): Promise<CardPack | null> {
	const isCloudScoped = thirdId !== undefined;
	const cardPackId = isCloudScoped ? thirdId : firstId;
	const pack = await client.get("card_pack", cardPackId);
	if (!pack) return null;
	if (isCloudScoped) {
		if (!hasCloudOwnership(pack, firstId, secondId)) return null;
	} else if (!hasLegacyOwnership(pack, secondId)) {
		return null;
	}
	return pack;
}

export function createCardPack(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	input: CreateCardPackInput,
): Promise<CardPack>;
export function createCardPack(
	client: ApiClient,
	ownerUserId: string,
	input: CreateCardPackInput,
): Promise<CardPack>;
export async function createCardPack(
	client: ApiClient,
	accountUserIdOrOwnerUserId: string,
	profileIdOrInput: string | CreateCardPackInput,
	maybeInput?: CreateCardPackInput,
): Promise<CardPack> {
	const now = nowIso();
	const profileId =
		typeof profileIdOrInput === "string" ? profileIdOrInput : accountUserIdOrOwnerUserId;
	const input =
		typeof profileIdOrInput === "string" ? maybeInput : profileIdOrInput;
	if (!input) {
		throw new Error("Card pack input is required");
	}
	const payload: CardPackInsert = {
		...DEFAULT_CARD_PACK,
		...input,
		...createCloudOwnership(accountUserIdOrOwnerUserId, profileId),
		updated_at: null,
	};

	const record: CardPack = {
		id: generateId(),
		name: payload.name,
		type: payload.type ?? DEFAULT_CARD_PACK_TYPE,
		account_user_id: payload.account_user_id,
		profile_id: payload.profile_id,
		owner_user_id: payload.owner_user_id,
		status: payload.status ?? DEFAULT_CARD_PACK.status,
		created_at: now,
		updated_at: payload.updated_at ?? null,
	};

	await client.put("card_pack", record);
	return record;
}

export function updateCardPack(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardPackId: string,
	updates: CardPackUpdate,
): Promise<CardPack | null>;
export function updateCardPack(
	client: ApiClient,
	cardPackId: string,
	ownerUserId: string,
	updates: CardPackUpdate,
): Promise<CardPack | null>;
export async function updateCardPack(
	client: ApiClient,
	firstId: string,
	secondId: string,
	thirdIdOrUpdates: string | CardPackUpdate,
	maybeUpdates?: CardPackUpdate,
): Promise<CardPack | null> {
	const isCloudScoped = typeof thirdIdOrUpdates === "string";
	const existing = isCloudScoped
		? await getCardPackById(client, firstId, secondId, thirdIdOrUpdates)
		: await getCardPackById(client, firstId, secondId);
	if (!existing) return null;

	const updated: CardPack = {
		...existing,
		...((isCloudScoped ? maybeUpdates : thirdIdOrUpdates) ?? {}),
		updated_at: nowIso(),
	};

	await client.put("card_pack", updated);
	return updated;
}

export function deleteCardPack(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	cardPackId: string,
): Promise<void>;
export function deleteCardPack(
	client: ApiClient,
	cardPackId: string,
	ownerUserId: string,
): Promise<void>;
export async function deleteCardPack(
	client: ApiClient,
	firstId: string,
	secondId: string,
	thirdId?: string,
): Promise<void> {
	const pack = thirdId
		? await getCardPackById(client, firstId, secondId, thirdId)
		: await getCardPackById(client, firstId, secondId);
	if (!pack) return;
	await client.delete("card_pack", pack.id);
}
