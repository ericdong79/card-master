import type { DurationSpec } from "@/lib/scheduling/types";

export type Sm2Parameters = {
	learningSteps: DurationSpec[];
	easyInterval: DurationSpec;
	startingEase: number;
	easyBonus: number;
	intervalMultiplier: number;
	maxInterval: DurationSpec;
	forgotInterval: DurationSpec;
	relearningSteps: DurationSpec[];
	lapseIntervalMultiplier: number;
	minimumEase?: number;
};

export type Sm2State = {
	schema_version: 1;
	algorithm: "sm2";
	updated_at: string;
	phase: "learning" | "review" | "relearning";
	ease: number;
	intervalDays: number;
	repetitions: number;
	lapses: number;
	stepIndex: number;
	pendingIntervalDays: number | null;
	lastReviewedAt: string | null;
};
