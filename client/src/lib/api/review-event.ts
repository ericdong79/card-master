import type { ApiClient } from "./client";
import type { ReviewEventInsert } from "./dtos/review-event";
import type { ReviewEvent } from "./entities/review-event";
import { generateId, nowIso } from "./utils";

export async function createReviewEvent(
	client: ApiClient,
	payload: ReviewEventInsert,
): Promise<ReviewEvent> {
	const record: ReviewEvent = {
		...payload,
		id: generateId(),
		created_at: nowIso(),
	};

	await client.put("review_event", record);
	return record;
}
