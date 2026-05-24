import type { CardMasteryState } from "../entities/card-mastery-state";

type CardMasteryStateOwnership = Required<
	Pick<CardMasteryState, "account_user_id" | "profile_id" | "owner_user_id">
>;

export type CardMasteryStateInsert = Omit<
	CardMasteryState,
	"id" | "account_user_id" | "profile_id" | "owner_user_id" | "created_at" | "updated_at"
> &
	CardMasteryStateOwnership;

export type CardMasteryStateUpdate = Partial<
	Omit<
		CardMasteryState,
		| "id"
		| "account_user_id"
		| "profile_id"
		| "owner_user_id"
		| "card_id"
		| "created_at"
	>
>;
