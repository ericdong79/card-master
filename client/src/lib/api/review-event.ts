import type { ApiClient } from "./client";
import type { ReviewEventInsert } from "./dtos/review-event";
import type { ReviewEvent } from "./entities/review-event";
import { generateId, nowIso } from "./utils";

type LegacyReviewEventInsert = Omit<
	ReviewEventInsert,
	"account_user_id" | "profile_id"
> & {
	account_user_id?: string;
	profile_id?: string;
};

export function createReviewEvent(
	client: ApiClient,
	payload: ReviewEventInsert,
): Promise<ReviewEvent>;
export function createReviewEvent(
	client: ApiClient,
	payload: LegacyReviewEventInsert,
): Promise<ReviewEvent>;
export async function createReviewEvent(
	client: ApiClient,
	payload: ReviewEventInsert | LegacyReviewEventInsert,
): Promise<ReviewEvent> {
	const record: ReviewEvent = {
		...payload,
		id: generateId(),
		created_at: nowIso(),
	};

	await client.put("review_event", record);
	return record;
}
