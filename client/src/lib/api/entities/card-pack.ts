export type CardPackStatus = "active" | "suspended" | "deleted";
export type CardPackType = "basic" | "image-recall" | "pinyin-hanzi";

export const DEFAULT_CARD_PACK_TYPE: CardPackType = "basic";

export type CardPack = {
	id: string;
	name: string;
	type?: CardPackType;
	owner_user_id: string;
	status: CardPackStatus;
	created_at: string;
	updated_at: string | null;
};

export function resolveCardPackType(type: CardPack["type"]): CardPackType {
	return type ?? DEFAULT_CARD_PACK_TYPE;
}
