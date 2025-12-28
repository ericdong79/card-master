import type { SupabaseClient } from "@supabase/supabase-js";

import type { CardInsert, CardUpdate } from "./dtos/card";
import type { Card, CardStatus } from "./entities/card";

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
	supabase: SupabaseClient,
	ownerUserId: string,
	filters: CardListFilters = {},
): Promise<Card[]> {
	let query = supabase.from("card").select("*").eq("owner_user_id", ownerUserId);

	if (filters.cardPackId) {
		query = query.eq("card_pack_id", filters.cardPackId);
	}

	if (filters.status) {
		query = query.eq("status", filters.status);
	}

	const { data, error } = await query.order("created_at", { ascending: true });

	if (error) {
		throw error;
	}

	return data ?? [];
}

export async function getCardById(
	supabase: SupabaseClient,
	cardId: string,
	ownerUserId: string,
): Promise<Card | null> {
	const { data, error } = await supabase
		.from("card")
		.select("*")
		.eq("id", cardId)
		.eq("owner_user_id", ownerUserId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data ?? null;
}

export async function createCard(
	supabase: SupabaseClient,
	ownerUserId: string,
	input: CreateCardInput,
): Promise<Card> {
	const payload: CardInsert = {
		...DEFAULT_CARD,
		...input,
		owner_user_id: ownerUserId,
	};

	const { data, error } = await supabase
		.from("card")
		.insert(payload)
		.select("*")
		.single();

	if (error || !data) {
		throw error ?? new Error("Failed to create card");
	}

	return data;
}

export async function updateCard(
	supabase: SupabaseClient,
	cardId: string,
	ownerUserId: string,
	updates: CardUpdate,
): Promise<Card> {
	const { data, error } = await supabase
		.from("card")
		.update(updates)
		.eq("id", cardId)
		.eq("owner_user_id", ownerUserId)
		.select("*")
		.single();

	if (error || !data) {
		throw error ?? new Error("Failed to update card");
	}

	return data;
}

export async function deleteCard(
	supabase: SupabaseClient,
	cardId: string,
	ownerUserId: string,
): Promise<void> {
	const { error } = await supabase
		.from("card")
		.delete()
		.eq("id", cardId)
		.eq("owner_user_id", ownerUserId);

	if (error) {
		throw error;
	}
}
