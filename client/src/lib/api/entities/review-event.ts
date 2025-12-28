export type ReviewEvent = {
	id: string;
	card_id: string;
	owner_user_id: string;
	grade: number;
	time_ms: number;
	raw_payload: Record<string, unknown> | null;
	reviewed_at: string;
	created_at: string;
};
