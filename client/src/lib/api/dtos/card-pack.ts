import type { CardPack } from "../entities/card-pack";

export type CardPackInsert = Omit<CardPack, "id" | "created_at" | "updated_at"> & {
	updated_at?: string | null;
};

export type CardPackUpdate = Partial<
	Omit<CardPack, "id" | "owner_user_id" | "created_at">
>;
