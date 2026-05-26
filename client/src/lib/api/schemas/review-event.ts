import { z } from "zod";

/**
 * Zod schema for the `review_event` entity. `raw_payload` is kept loose
 * (`z.record(...)`) because callers store algorithm-specific event blobs.
 */
export const ReviewEventSchema = z.object({
	id: z.string(),
	card_id: z.string(),
	owner_user_id: z.string(),
	account_user_id: z.string().optional(),
	profile_id: z.string().optional(),
	grade: z.number(),
	time_ms: z.number(),
	raw_payload: z.record(z.string(), z.unknown()).nullable(),
	reviewed_at: z.string(),
	created_at: z.string(),
});
