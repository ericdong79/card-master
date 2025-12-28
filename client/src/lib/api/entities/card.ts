import type { CardPack } from "./card-pack";

export type CardStatus = "active" | "suspended" | "deleted";

export type Card = {
	id: string;
	card_pack_id: CardPack["id"];
	owner_user_id: string;
	prompt: string;
	answer: string;
	status: CardStatus;
	created_at: string;
	updated_at: string | null;
};
