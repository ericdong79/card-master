import type { CardPack } from "./card-pack";

export type CardStatus = "active" | "suspended" | "deleted";

export type CardMediaKind = "image" | "audio";

export type CardMediaAsset = {
	kind: CardMediaKind;
	mime_type: string;
	data_url: string;
};

export type CardSideContent = {
	text?: string;
	image?: CardMediaAsset;
	audio?: CardMediaAsset;
};

export type Card = {
	id: string;
	card_pack_id: CardPack["id"];
	owner_user_id: string;
	prompt: string;
	answer: string;
	question_content?: CardSideContent | null;
	answer_content?: CardSideContent | null;
	status: CardStatus;
	created_at: string;
	updated_at: string | null;
};
