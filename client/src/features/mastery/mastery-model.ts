import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { ReviewGrade, Sm2State } from "@/lib/scheduling/types";
import type { MasteryState, MasteryTransition } from "./types";

export type MasteryModelConfig = {
	masteredIntervalDays: number;
	masteredEasyStreak: number;
	recentWindowSize: number;
	masteredAccuracy: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_MASTERY_MODEL_CONFIG: MasteryModelConfig = {
	masteredIntervalDays: 100,
	masteredEasyStreak: 3,
	recentWindowSize: 10,
	masteredAccuracy: 0.85,
};

const GRADE_DELTA: Record<ReviewGrade, number> = {
	again: -12,
	hard: -4,
	good: 6,
	easy: 10,
};

export type MasteryUpdateInput = {
	existing: CardMasteryState | null;
	ownerUserId: string;
	cardId: string;
	grade: ReviewGrade;
	now: Date;
	previousDueAt?: Date | null;
	nextDueAt: Date;
	previousSm2State: Sm2State | null;
	nextSm2State: Sm2State;
	config?: Partial<MasteryModelConfig>;
};

export type MasteryUpdateOutput = {
	nextMastery: Omit<CardMasteryState, "id" | "created_at" | "updated_at">;
	transition: MasteryTransition;
	isFirstLearn: boolean;
};

function clampScore(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

function getFutureIntervalDays(now: Date, dueAt: Date): number {
	return Math.max(0, Math.floor((dueAt.getTime() - now.getTime()) / DAY_MS));
}

function getAccuracy(outcomes: boolean[]): number {
	if (outcomes.length === 0) return 0;
	const correct = outcomes.filter(Boolean).length;
	return correct / outcomes.length;
}

function computeBaseState(
	nextSm2State: Sm2State,
	previousSm2State: Sm2State | null,
	isMastered: boolean,
	isFirstLearn: boolean,
): MasteryState {
	if (isMastered) return "mastered";
	if (isFirstLearn) return "learning";

	const justGraduated =
		nextSm2State.phase === "review" &&
		(previousSm2State == null || previousSm2State.phase !== "review");
	if (justGraduated) return "graduated";

	if (nextSm2State.phase === "learning" || nextSm2State.phase === "relearning") {
		return "learning";
	}

	return "reviewing";
}

export function computeMasteryUpdate(input: MasteryUpdateInput): MasteryUpdateOutput {
	const config: MasteryModelConfig = {
		...DEFAULT_MASTERY_MODEL_CONFIG,
		...input.config,
	};

	const previous = input.existing;
	const beforeScore = previous?.mastery_score ?? 0;
	const beforeState = previous?.mastery_state ?? "unseen";
	const isFirstLearn = previous == null;

	const recentOutcomes = [...(previous?.recent_outcomes ?? []), input.grade !== "again"].slice(
		-config.recentWindowSize,
	);
	const easyStreak = input.grade === "easy" ? (previous?.easy_streak ?? 0) + 1 : 0;

	let delta = GRADE_DELTA[input.grade];

	const nextIntervalDays = getFutureIntervalDays(input.now, input.nextDueAt);
	if (nextIntervalDays >= 300) delta += 7;
	else if (nextIntervalDays >= 100) delta += 5;
	else if (nextIntervalDays >= 30) delta += 3;
	else if (nextIntervalDays >= 7) delta += 2;

	if (input.grade === "again" && input.previousDueAt && input.previousDueAt.getTime() < input.now.getTime()) {
		const overdueDays = Math.floor((input.now.getTime() - input.previousDueAt.getTime()) / DAY_MS);
		delta -= Math.min(8, Math.max(0, Math.floor(overdueDays / 7) + 2));
	}

	let afterScore = clampScore(beforeScore + delta);
	const accuracy = getAccuracy(recentOutcomes);
	const isMastered =
		easyStreak >= config.masteredEasyStreak &&
		nextIntervalDays >= config.masteredIntervalDays &&
		accuracy >= config.masteredAccuracy;

	if (isMastered) {
		afterScore = 100;
	}

	const afterState = computeBaseState(
		input.nextSm2State,
		input.previousSm2State,
		isMastered,
		isFirstLearn,
	);

	return {
		nextMastery: {
			owner_user_id: input.ownerUserId,
			card_id: input.cardId,
			mastery_score: afterScore,
			mastery_state: afterState,
			easy_streak: easyStreak,
			recent_outcomes: recentOutcomes,
		},
		transition: {
			beforeScore,
			afterScore,
			beforeState,
			afterState,
			delta: afterScore - beforeScore,
		},
		isFirstLearn,
	};
}
