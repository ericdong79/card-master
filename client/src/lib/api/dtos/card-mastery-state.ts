import type { CardMasteryState } from "../entities/card-mastery-state";

export type CardMasteryStateInsert = Omit<CardMasteryState, "id" | "created_at" | "updated_at">;

export type CardMasteryStateUpdate = Partial<Omit<CardMasteryState, "id" | "owner_user_id" | "card_id" | "created_at">>;
