import type { CardSchedulingState } from "../entities/card-scheduling-state";

export type CardSchedulingStateInsert = Omit<
	CardSchedulingState,
	"id" | "created_at" | "last_event_id"
> & {
	last_event_id?: string | null;
};

export type CardSchedulingStateUpdate = Partial<
	Omit<CardSchedulingState, "id" | "owner_user_id" | "card_id" | "profile_id" | "created_at">
>;
