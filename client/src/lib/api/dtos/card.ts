import type { Card } from "../entities/card";

export type CardInsert = Omit<Card, "id" | "created_at" | "updated_at"> & {
	updated_at?: string | null;
};

export type CardUpdate = Partial<Omit<Card, "id" | "owner_user_id" | "created_at">>;
