export type CardPackStatus = "active" | "suspended" | "deleted";

export type CardPack = {
	id: string;
	name: string;
	owner_user_id: string;
	status: CardPackStatus;
	created_at: string;
	updated_at: string | null;
};
