import type { SupabaseClient } from "@supabase/supabase-js";

import type {
	CardSchedulingStateInsert,
	CardSchedulingStateUpdate,
} from "./dtos/card-scheduling-state";
import type { CardSchedulingState } from "./entities/card-scheduling-state";

export async function listSchedulingStatesByCardIds(
	supabase: SupabaseClient,
	ownerUserId: string,
	cardIds: string[],
): Promise<CardSchedulingState[]> {
	if (cardIds.length === 0) return [];
	const { data, error } = await supabase
		.from("card_scheduling_state")
		.select("*")
		.eq("owner_user_id", ownerUserId)
		.in("card_id", cardIds);

	if (error) {
		throw error;
	}

	return data ?? [];
}

export async function insertSchedulingState(
	supabase: SupabaseClient,
	input: CardSchedulingStateInsert,
): Promise<CardSchedulingState> {
	const { data, error } = await supabase
		.from("card_scheduling_state")
		.insert(input)
		.select("*")
		.single();

	if (error || !data) {
		throw error ?? new Error("Failed to insert scheduling state");
	}

	return data;
}

export async function updateSchedulingState(
	supabase: SupabaseClient,
	stateId: string,
	ownerUserId: string,
	updates: CardSchedulingStateUpdate,
): Promise<CardSchedulingState | null> {
	const { data, error } = await supabase
		.from("card_scheduling_state")
		.update(updates)
		.eq("id", stateId)
		.eq("owner_user_id", ownerUserId)
		.select("*")
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data ?? null;
}

export async function upsertSchedulingState(
	supabase: SupabaseClient,
	existing: CardSchedulingState | null,
	input: CardSchedulingStateInsert,
): Promise<CardSchedulingState> {
	if (existing) {
		const updated = await updateSchedulingState(supabase, existing.id, existing.owner_user_id, input);
		return updated ?? { ...existing, ...input };
	}

	return insertSchedulingState(supabase, input);
}
