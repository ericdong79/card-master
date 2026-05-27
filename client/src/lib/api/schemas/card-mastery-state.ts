import { z } from "zod";

import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";

/**
 * Zod schema for the `card_mastery_state` entity.
 */
export const CardMasteryStateSchema = z.object({
	id: z.string(),
	owner_user_id: z.string(),
	account_user_id: z.string().optional(),
	profile_id: z.string().optional(),
	card_id: z.string(),
	mastery_score: z.number(),
	mastery_state: z.union([
		z.literal("unseen"),
		z.literal("learning"),
		z.literal("graduated"),
		z.literal("reviewing"),
		z.literal("mastered"),
	]),
	easy_streak: z.number(),
	recent_outcomes: z.array(z.boolean()),
	created_at: z.string(),
	updated_at: z.string(),
});

function clampScore(score: unknown): number {
	if (typeof score !== "number" || Number.isNaN(score)) return 0;
	return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeMasteryStateValue(value: unknown): CardMasteryState["mastery_state"] {
	switch (value) {
		case "learning":
		case "graduated":
		case "reviewing":
		case "mastered":
			return value;
		default:
			return "unseen";
	}
}

/**
 * Normalises a candidate `CardMasteryState` shape so the persisted document
 * matches the entity contract. Mirrors `normalizeCardSchedulingState` in
 * `lib/api/schemas/card-scheduling-state.ts`.
 *
 * - `mastery_score` is clamped to [0, 100] integer.
 * - `mastery_state` falls back to "unseen" if not a known value.
 * - `easy_streak` defaults to 0 if not a positive number.
 * - `recent_outcomes` is coerced to boolean[].
 * - `updated_at` falls back to a fresh ISO timestamp if missing.
 */
export function normalizeCardMasteryState(record: CardMasteryState): CardMasteryState {
	return {
		...record,
		mastery_score: clampScore(record.mastery_score),
		mastery_state: normalizeMasteryStateValue(record.mastery_state),
		easy_streak:
			typeof record.easy_streak === "number" && record.easy_streak > 0
				? Math.floor(record.easy_streak)
				: 0,
		recent_outcomes: Array.isArray(record.recent_outcomes)
			? record.recent_outcomes.map((item) => Boolean(item))
			: [],
		updated_at:
			typeof record.updated_at === "string" ? record.updated_at : new Date().toISOString(),
	};
}
