import type { Card } from "../entities/card";

type CardOwnership = Required<
	Pick<Card, "account_user_id" | "profile_id" | "owner_user_id">
>;

export type CardInsert = Omit<
	Card,
	"id" | "account_user_id" | "profile_id" | "owner_user_id" | "created_at" | "updated_at"
> &
	CardOwnership & {
	updated_at?: string | null;
};

export type CardUpdate = Partial<
	Omit<Card, "id" | "account_user_id" | "profile_id" | "owner_user_id" | "created_at">
>;
