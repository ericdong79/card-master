import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReviewEventInsert } from "./dtos/review-event";
import type { ReviewEvent } from "./entities/review-event";

export async function createReviewEvent(
	supabase: SupabaseClient,
	payload: ReviewEventInsert,
): Promise<ReviewEvent> {
	const { data, error } = await supabase
		.from("review_event")
		.insert(payload)
		.select("*")
		.single();

	if (error || !data) {
		throw error ?? new Error("Failed to create review event");
	}

	return data;
}
