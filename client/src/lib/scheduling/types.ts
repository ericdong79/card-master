export type ReviewGrade = "again" | "hard" | "good" | "easy";

export type ReviewEvent = {
	grade: ReviewGrade;
	reviewedAt: Date;
	timeMs?: number;
};

export type SchedulingResult<State> = {
	nextState: State;
	dueAt: Date;
};

export interface SchedulingAlgorithm<State, Params> {
	key: string;
	version: number;
	applyReview(input: {
		previousState: State | null;
		review: ReviewEvent;
		params: Params;
	}): SchedulingResult<State>;
}
