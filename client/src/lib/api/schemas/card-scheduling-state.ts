import { z } from "zod";

import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";

/**
 * Zod schema for the `card_scheduling_state` entity.
 *
 * `state` is intentionally loose (`z.record(z.string(), z.unknown())`) because
 * multiple scheduling algorithms (SM-2 today, future FSRS, etc.) write into
 * this field. A future improvement is a discriminated union keyed by
 * `state.algorithm` so each algorithm has its own typed schema.
 */
export const CardSchedulingStateSchema = z.object({
	id: z.string(),
	owner_user_id: z.string(),
	account_user_id: z.string().optional(),
	learner_profile_id: z.string().optional(),
	card_id: z.string(),
	profile_id: z.string(),
	due_at: z.string(),
	state: z.record(z.string(), z.unknown()),
	last_reviewed_at: z.string(),
	last_event_id: z.string().nullable(),
	created_at: z.string(),
});

/**
 * Normalises a candidate `CardSchedulingState` shape (typically the result of
 * spreading existing record + caller updates) so the persisted document
 * matches the entity contract. Mirrors `normalizeCardMasteryState` in
 * `lib/api/card-mastery-state.ts`.
 *
 * - Strings are coerced via String() where present, fall back to existing
 *   value otherwise.
 * - `state` falls back to `{}` if it's not a plain object.
 * - `last_event_id` is normalised to `string | null`.
 */
export function normalizeCardSchedulingState(
	record: CardSchedulingState,
): CardSchedulingState {
	const state =
		record.state && typeof record.state === "object" && !Array.isArray(record.state)
			? (record.state as Record<string, unknown>)
			: {};

	return {
		...record,
		state,
		last_event_id:
			typeof record.last_event_id === "string" ? record.last_event_id : null,
	};
}
