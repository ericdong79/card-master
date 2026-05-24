import type { ReviewEvent } from "../entities/review-event";

type ReviewEventOwnership = Required<
	Pick<ReviewEvent, "account_user_id" | "profile_id" | "owner_user_id">
>;

export type ReviewEventInsert = Omit<
	ReviewEvent,
	"id" | "account_user_id" | "profile_id" | "owner_user_id" | "created_at"
> &
	ReviewEventOwnership;
