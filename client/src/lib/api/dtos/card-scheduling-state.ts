import type { CardSchedulingState } from "../entities/card-scheduling-state";

type CardSchedulingStateOwnership = Required<
	Pick<CardSchedulingState, "account_user_id" | "learner_profile_id" | "owner_user_id">
>;

export type CardSchedulingStateInsert = Omit<
	CardSchedulingState,
	| "id"
	| "account_user_id"
	| "learner_profile_id"
	| "owner_user_id"
	| "created_at"
	| "last_event_id"
> &
	CardSchedulingStateOwnership & {
	last_event_id?: string | null;
};

export type CardSchedulingStateUpdate = Partial<
	Omit<
		CardSchedulingState,
		| "id"
		| "account_user_id"
		| "learner_profile_id"
		| "owner_user_id"
		| "card_id"
		| "profile_id"
		| "created_at"
	>
>;
