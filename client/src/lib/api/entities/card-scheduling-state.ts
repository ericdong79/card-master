export type CardSchedulingState = {
	id: string;
	owner_user_id: string;
	card_id: string;
	profile_id: string;
	due_at: string;
	state: Record<string, unknown>;
	last_reviewed_at: string;
	last_event_id: string | null;
	created_at: string;
};
