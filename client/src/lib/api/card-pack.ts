import type { SupabaseClient } from "@supabase/supabase-js";

import type { CardPackInsert, CardPackUpdate } from "./dtos/card-pack";
import type { CardPack } from "./entities/card-pack";

const DEFAULT_CARD_PACK: Pick<CardPackInsert, "status"> = {
	status: "active",
};

type CreateCardPackInput = Omit<CardPackInsert, "owner_user_id" | "status"> &
	Partial<Pick<CardPackInsert, "status">>;

export type CardPackWithCounts = CardPack & {
	cards_count: number;
};

export async function listCardPacks(
	supabase: SupabaseClient,
	ownerUserId: string,
): Promise<CardPack[]> {
	const { data, error } = await supabase
		.from("card_pack")
		.select("*")
		.eq("owner_user_id", ownerUserId)
		.order("created_at", { ascending: true });

	if (error) {
		throw error;
	}

	return data ?? [];
}

export async function listCardPacksWithCounts(
	supabase: SupabaseClient,
	ownerUserId: string,
): Promise<CardPackWithCounts[]> {
	const [cardPacks, countsResponse] = await Promise.all([
		listCardPacks(supabase, ownerUserId),
		supabase
			.from("card")
			.select("card_pack_id")
			.eq("owner_user_id", ownerUserId),
	]);

	if (countsResponse.error) {
		throw countsResponse.error;
	}

	const countsMap = new Map<string, number>();

	for (const row of countsResponse.data ?? []) {
		if (!row || typeof row.card_pack_id !== "string") continue;
		countsMap.set(
			row.card_pack_id,
			(countsMap.get(row.card_pack_id) ?? 0) + 1,
		);
	}

	return cardPacks.map((pack) => ({
		...pack,
		cards_count: countsMap.get(pack.id) ?? 0,
	}));
}

export async function getCardPackById(
	supabase: SupabaseClient,
	cardPackId: string,
	ownerUserId: string,
): Promise<CardPack | null> {
	const { data, error } = await supabase
		.from("card_pack")
		.select("*")
		.eq("id", cardPackId)
		.eq("owner_user_id", ownerUserId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data ?? null;
}

export async function createCardPack(
	supabase: SupabaseClient,
	ownerUserId: string,
	input: CreateCardPackInput,
): Promise<CardPack> {
	const payload: CardPackInsert = {
		...DEFAULT_CARD_PACK,
		...input,
		owner_user_id: ownerUserId,
	};

	const { data, error } = await supabase
		.from("card_pack")
		.insert(payload)
		.select("*")
		.single();

	if (error || !data) {
		throw error ?? new Error("Failed to create card pack");
	}

	return data;
}

export async function updateCardPack(
	supabase: SupabaseClient,
	cardPackId: string,
	ownerUserId: string,
	updates: CardPackUpdate,
): Promise<CardPack | null> {
	// Some PostgREST setups throw PGRST116 when requesting a single-row representation
	// after an update. We split the write and read to avoid that error but still return
	// the latest record when policies allow reads.
	const { error: updateError } = await supabase
		.from("card_pack")
		.update(updates)
		.eq("id", cardPackId)
		.eq("owner_user_id", ownerUserId);

	if (updateError) {
		throw updateError;
	}

	return getCardPackById(supabase, cardPackId, ownerUserId);
}

export async function deleteCardPack(
	supabase: SupabaseClient,
	cardPackId: string,
	ownerUserId: string,
): Promise<void> {
	const { error } = await supabase
		.from("card_pack")
		.delete()
		.eq("id", cardPackId)
		.eq("owner_user_id", ownerUserId);

	if (error) {
		throw error;
	}
}
