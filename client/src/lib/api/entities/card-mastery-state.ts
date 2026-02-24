export type MasteryState = "unseen" | "learning" | "graduated" | "reviewing" | "mastered";

export type CardMasteryState = {
	id: string;
	owner_user_id: string;
	card_id: string;
	mastery_score: number;
	mastery_state: MasteryState;
	easy_streak: number;
	recent_outcomes: boolean[];
	created_at: string;
	updated_at: string;
};
