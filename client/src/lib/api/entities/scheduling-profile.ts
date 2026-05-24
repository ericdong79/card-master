export type SchedulingProfile = {
	id: string;
	owner_user_id: string;
	account_user_id?: string;
	profile_id?: string;
	algorithm_key: string;
	parameters: Record<string, unknown>;
	version: number;
	created_at: string;
};
