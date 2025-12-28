import type { SupabaseClient } from "@supabase/supabase-js";

import type { CardPackInsert, CardPackUpdate } from "./dtos/card-pack";
import type { CardPack } from "./entities/card-pack";

const DEFAULT_CARD_PACK: Pick<CardPackInsert, "status"> = {
	status: "active",
};

type CreateCardPackInput = Omit<CardPackInsert, "owner_user_id" | "status"> &
	Partial<Pick<CardPackInsert, "status">>;

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
): Promise<CardPack> {
	const { data, error } = await supabase
		.from("card_pack")
		.update(updates)
		.eq("id", cardPackId)
		.eq("owner_user_id", ownerUserId)
		.select("*")
		.single();

	if (error || !data) {
		throw error ?? new Error("Failed to update card pack");
	}

	return data;
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
