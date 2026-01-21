import { daysToMs, msToDays, safeParseDuration } from "@/lib/api/utils";
import { SM2_DEFAULT_PARAMETERS, EASY_EASE_BONUS, AGAIN_EASE_PENALTY, HARD_INTERVAL_FACTOR, HARD_EASE_PENALTY } from "@/lib/scheduling/sm2/const";
import type { Sm2Parameters, Sm2State, ReviewGrade, SchedulingResult, SchedulingAlgorithm } from "@/lib/scheduling/types";

export const normalizeSm2Parameters = (
	params: Partial<Sm2Parameters> | null | undefined,
): Sm2Parameters => {
	const merged: Sm2Parameters = {
		...SM2_DEFAULT_PARAMETERS,
		...(params ?? {}),
	};

	return {
		...merged,
		learningSteps: merged.learningSteps,
		relearningSteps: merged.relearningSteps,
		easyInterval: merged.easyInterval,
		maxInterval: merged.maxInterval,
		forgotInterval: merged.forgotInterval,
	};
};


const clampEase = (ease: number, minimumEase: number): number =>
	Math.max(minimumEase, Number.isFinite(ease) ? ease : minimumEase);

const clampIntervalDays = (days: number, maxDays: number): number =>
	Math.min(maxDays, Math.max(0, days));

const initialState = (params: Sm2Parameters, now: Date): Sm2State => ({
	schema_version: 1,
	algorithm: "sm2",
	updated_at: now.toISOString(),
	phase: "learning",
	ease: params.startingEase,
	intervalDays: 0,
	repetitions: 0,
	lapses: 0,
	stepIndex: 0,
	pendingIntervalDays: null,
	lastReviewedAt: null,
});

const applyLearningPhase = (
	state: Sm2State,
	grade: ReviewGrade,
	params: Sm2Parameters,
	now: Date,
	maxDays: number,
): SchedulingResult<Sm2State> => {
	const stepsMs = params.learningSteps.map((val)=>safeParseDuration(val));
	const firstStepMs = stepsMs[0] ?? safeParseDuration("1d");

	if (grade === "again") {
		const dueAt = new Date(now.getTime() + firstStepMs);
		return {
			dueAt,
			nextState: {
				...state,
				phase: "learning",
				stepIndex: 0,
				lastReviewedAt: now.toISOString(),
			},
		};
	}

	if (grade === "hard") {
		const currentIndex = state.stepIndex;
		const stepMs = stepsMs[currentIndex] ?? firstStepMs;
		const dueAt = new Date(now.getTime() + stepMs);
		return {
			dueAt,
			nextState: {
				...state,
				phase: "learning",
				stepIndex: currentIndex,
				lastReviewedAt: now.toISOString(),
			},
		};
	}

	if (grade === "good") {
		const nextIndex = state.stepIndex + 1;
		if (nextIndex < stepsMs.length) {
			const dueAt = new Date(now.getTime() + stepsMs[nextIndex]);
			return {
				dueAt,
				nextState: {
					...state,
					phase: "learning",
					stepIndex: nextIndex,
					lastReviewedAt: now.toISOString(),
				},
			};
		}

		const graduatingDays = msToDays(stepsMs[stepsMs.length - 1] ?? firstStepMs);
		const intervalDays = clampIntervalDays(
			graduatingDays * params.intervalMultiplier,
			maxDays,
		);
		const dueAt = new Date(now.getTime() + daysToMs(intervalDays));
		return {
			dueAt,
			nextState: {
				...state,
				phase: "review",
				stepIndex: 0,
				intervalDays,
				repetitions: state.repetitions + 1,
				lastReviewedAt: now.toISOString(),
			},
		};
	}

	// easy -> skip remaining steps and graduate
	const easyDays = safeParseDuration(params.easyInterval,'d');
	const intervalDays = clampIntervalDays(
		easyDays * params.intervalMultiplier,
		maxDays,
	);
	const dueAt = new Date(now.getTime() + daysToMs(intervalDays));
	return {
		dueAt,
		nextState: {
			...state,
			phase: "review",
			stepIndex: 0,
			intervalDays,
			repetitions: state.repetitions + 1,
			ease: clampEase(state.ease + EASY_EASE_BONUS, params.minimumEase ?? 1.3),
			lastReviewedAt: now.toISOString(),
		},
	};
};

const applyReviewPhase = (
	state: Sm2State,
	grade: ReviewGrade,
	params: Sm2Parameters,
	now: Date,
	maxDays: number,
): SchedulingResult<Sm2State> => {
	if (grade === "again") {
		const pendingIntervalDays = Math.max(
			1,
			(state.intervalDays || 1) * params.lapseIntervalMultiplier,
		);
		const dueAt = new Date(now.getTime() + (params.forgotInterval));
		return {
			dueAt,
			nextState: {
				...state,
				phase: "relearning",
				stepIndex: 0,
				lapses: state.lapses + 1,
				pendingIntervalDays,
				ease: clampEase(
					state.ease - AGAIN_EASE_PENALTY,
					params.minimumEase ?? 1.3,
				),
				lastReviewedAt: now.toISOString(),
			},
		};
	}

	if (grade === "hard") {
		const intervalDays = clampIntervalDays(
			state.intervalDays * HARD_INTERVAL_FACTOR * params.intervalMultiplier,
			maxDays,
		);
		const dueAt = new Date(now.getTime() + daysToMs(intervalDays));
		return {
			dueAt,
			nextState: {
				...state,
				phase: "review",
				intervalDays,
				repetitions: state.repetitions + 1,
				ease: clampEase(
					state.ease - HARD_EASE_PENALTY,
					params.minimumEase ?? 1.3,
				),
				lastReviewedAt: now.toISOString(),
			},
		};
	}

	if (grade === "good") {
		const intervalDays = clampIntervalDays(
			state.intervalDays * state.ease * params.intervalMultiplier,
			maxDays,
		);
		const dueAt = new Date(now.getTime() + daysToMs(intervalDays));
		return {
			dueAt,
			nextState: {
				...state,
				phase: "review",
				intervalDays,
				repetitions: state.repetitions + 1,
				lastReviewedAt: now.toISOString(),
			},
		};
	}

	const intervalDays = clampIntervalDays(
		state.intervalDays *
			state.ease *
			params.easyBonus *
			params.intervalMultiplier,
		maxDays,
	);
	const dueAt = new Date(now.getTime() + daysToMs(intervalDays));
	return {
		dueAt,
		nextState: {
			...state,
			phase: "review",
			intervalDays,
			repetitions: state.repetitions + 1,
			ease: clampEase(state.ease + EASY_EASE_BONUS, params.minimumEase ?? 1.3),
			lastReviewedAt: now.toISOString(),
		},
	};
};

const applyRelearningPhase = (
	state: Sm2State,
	grade: ReviewGrade,
	params: Sm2Parameters,
	now: Date,
	maxDays: number,
): SchedulingResult<Sm2State> => {
	const stepsMs = params.relearningSteps.map(v=>safeParseDuration(v));
	const firstStepMs = stepsMs[0] ?? safeParseDuration(params.forgotInterval);

	if (grade === "again") {
		const dueAt = new Date(now.getTime() + firstStepMs);
		return {
			dueAt,
			nextState: {
				...state,
				stepIndex: 0,
				lastReviewedAt: now.toISOString(),
			},
		};
	}

	if (grade === "hard") {
		const stepMs = stepsMs[state.stepIndex] ?? firstStepMs;
		const dueAt = new Date(now.getTime() + stepMs);
		return {
			dueAt,
			nextState: {
				...state,
				lastReviewedAt: now.toISOString(),
			},
		};
	}

	if (grade === "good") {
		const nextIndex = state.stepIndex + 1;
		if (nextIndex < stepsMs.length) {
			const dueAt = new Date(now.getTime() + stepsMs[nextIndex]);
			return {
				dueAt,
				nextState: {
					...state,
					stepIndex: nextIndex,
					lastReviewedAt: now.toISOString(),
				},
			};
		}
	}

	// Either easy in relearning or good on the final step graduates back to review.
	const pendingIntervalDays =
		state.pendingIntervalDays ??
		Math.max(1, (state.intervalDays || 1) * params.lapseIntervalMultiplier);
	const intervalDays = clampIntervalDays(pendingIntervalDays, maxDays);
	const dueAt = new Date(now.getTime() + daysToMs(intervalDays));
	return {
		dueAt,
		nextState: {
			...state,
			phase: "review",
			stepIndex: 0,
			pendingIntervalDays: null,
			intervalDays,
			repetitions: state.repetitions + 1,
			lastReviewedAt: now.toISOString(),
		},
	};
};

export const sm2Scheduler: SchedulingAlgorithm<Sm2State, Sm2Parameters> = {
	key: "sm2",
	version: 1,
	applyReview: ({ previousState, review, params }) => {
		const now = review.reviewedAt;
		const minimumEase = params.minimumEase ?? 1.3;
		const state = previousState ?? initialState(params, now);
		const maxDays = msToDays(safeParseDuration(params.maxInterval));

		let result: SchedulingResult<Sm2State>;
		if (state.phase === "learning") {
			result = applyLearningPhase(state, review.grade, params, now, maxDays);
		} else if (state.phase === "relearning") {
			result = applyRelearningPhase(state, review.grade, params, now, maxDays);
		} else {
			result = applyReviewPhase(state, review.grade, params, now, maxDays);
		}

		return {
			dueAt: result.dueAt,
			nextState: {
				...result.nextState,
				updated_at: now.toISOString(),
				ease: clampEase(result.nextState.ease, minimumEase),
			},
		};
	},
};
