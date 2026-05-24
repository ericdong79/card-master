import type { CardPack } from "../entities/card-pack";

type CardPackOwnership = Required<
	Pick<CardPack, "account_user_id" | "profile_id" | "owner_user_id">
>;

export type CardPackInsert = Omit<
	CardPack,
	"id" | "account_user_id" | "profile_id" | "owner_user_id" | "created_at" | "updated_at"
> &
	CardPackOwnership & {
	updated_at?: string | null;
};

export type CardPackUpdate = Partial<
	Omit<
		CardPack,
		"id" | "account_user_id" | "profile_id" | "owner_user_id" | "created_at"
	>
>;
