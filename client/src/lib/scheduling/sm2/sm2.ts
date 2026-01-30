import { produce } from "immer";
import { daysToMs, msToDays, safeParseDuration } from "@/lib/api/utils";
import {
	AGAIN_EASE_PENALTY,
	EASY_EASE_BONUS,
	HARD_EASE_PENALTY,
	HARD_INTERVAL_FACTOR,
	SM2_DEFAULT_PARAMETERS,
} from "@/lib/scheduling/sm2/const";
import type {
	ReviewGrade,
	SchedulingAlgorithm,
	SchedulingResult,
	Sm2Parameters,
	Sm2State,
} from "@/lib/scheduling/types";

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

/** Context shared across all phase handlers */
type ReviewContext = {
	state: Sm2State;
	params: Sm2Parameters;
	now: Date;
	maxDays: number;
};

/** Helper to create base update applied to all state transitions */
const createBaseUpdate = (ctx: ReviewContext) => ({
	updated_at: ctx.now.toISOString(),
	lastReviewedAt: ctx.now.toISOString(),
});

type BaseUpdate = ReturnType<typeof createBaseUpdate>;

const applyBaseUpdate = (draft: Sm2State, baseUpdate: BaseUpdate) => {
	draft.updated_at = baseUpdate.updated_at;
	draft.lastReviewedAt = baseUpdate.lastReviewedAt;
};

const updateState = (
	state: Sm2State,
	baseUpdate: BaseUpdate,
	recipe?: (draft: Sm2State) => void,
): Sm2State =>
	produce(state, (draft) => {
		recipe?.(draft);
		applyBaseUpdate(draft, baseUpdate);
	});

const addMs = (now: Date, ms: number) => new Date(now.getTime() + ms);

const applyLearningPhase = (
	grade: ReviewGrade,
	ctx: ReviewContext,
): SchedulingResult<Sm2State> => {
	const { state, params, now, maxDays } = ctx;
	const stepsMs = params.learningSteps.map((val) => safeParseDuration(val));
	const firstStepMs = stepsMs[0] ?? safeParseDuration("1d");
	const baseUpdate = createBaseUpdate(ctx);

	if (grade === "again") {
		const dueAt = addMs(now, firstStepMs);
		const nextState = updateState(state, baseUpdate, (draft) => {
			draft.stepIndex = 0;
		});
		return { dueAt, nextState };
	}

	if (grade === "hard") {
		const currentIndex = state.stepIndex;
		const stepMs = stepsMs[currentIndex] ?? firstStepMs;
		const dueAt = addMs(now, stepMs);
		const nextState = updateState(state, baseUpdate, (draft) => {
			draft.stepIndex = currentIndex;
		});
		return { dueAt, nextState };
	}

	if (grade === "good") {
		const nextIndex = state.stepIndex + 1;
		if (nextIndex < stepsMs.length) {
			const dueAt = addMs(now, stepsMs[nextIndex]);
			const nextState = updateState(state, baseUpdate, (draft) => {
				draft.stepIndex = nextIndex;
			});
			return { dueAt, nextState };
		}

		const intervalDays = clampIntervalDays(1, maxDays);
		const dueAt = addMs(now, daysToMs(intervalDays));
		const nextState = updateState(state, baseUpdate, (draft) => {
			draft.phase = "review";
			draft.stepIndex = 0;
			draft.intervalDays = intervalDays;
			draft.repetitions += 1;
		});
		return { dueAt, nextState };
	}

	// easy -> skip remaining steps and graduate
	const easyDays = safeParseDuration(params.easyInterval, "d");
	const intervalDays = clampIntervalDays(easyDays, maxDays);
	const dueAt = addMs(now, daysToMs(intervalDays));
	const nextState = updateState(state, baseUpdate, (draft) => {
		draft.phase = "review";
		draft.stepIndex = 0;
		draft.intervalDays = intervalDays;
		draft.repetitions += 1;
		draft.ease = clampEase(
			state.ease + EASY_EASE_BONUS,
			params.minimumEase ?? 1.3,
		);
	});
	return { dueAt, nextState };
};

const applyReviewPhase = (
	grade: ReviewGrade,
	ctx: ReviewContext,
): SchedulingResult<Sm2State> => {
	const { state, params, now, maxDays } = ctx;
	const baseUpdate = createBaseUpdate(ctx);

	if (grade === "again") {
		const pendingIntervalDays = Math.max(
			1,
			(state.intervalDays || 1) * params.lapseIntervalMultiplier,
		);
		const dueAt = addMs(now, safeParseDuration(params.forgotInterval));
		const nextState = updateState(state, baseUpdate, (draft) => {
			draft.phase = "relearning";
			draft.stepIndex = 0;
			draft.lapses += 1;
			draft.pendingIntervalDays = pendingIntervalDays;
			draft.ease = clampEase(
				state.ease - AGAIN_EASE_PENALTY,
				params.minimumEase ?? 1.3,
			);
		});
		return { dueAt, nextState };
	}

	if (grade === "hard") {
		const intervalDays = clampIntervalDays(
			state.intervalDays * HARD_INTERVAL_FACTOR * params.intervalMultiplier,
			maxDays,
		);
		const dueAt = addMs(now, daysToMs(intervalDays));
		const nextState = updateState(state, baseUpdate, (draft) => {
			draft.intervalDays = intervalDays;
			draft.repetitions += 1;
			draft.ease = clampEase(
				state.ease - HARD_EASE_PENALTY,
				params.minimumEase ?? 1.3,
			);
		});
		return { dueAt, nextState };
	}

	if (grade === "good") {
		const intervalDays = clampIntervalDays(
			state.intervalDays * state.ease * params.intervalMultiplier,
			maxDays,
		);
		const dueAt = addMs(now, daysToMs(intervalDays));
		const nextState = updateState(state, baseUpdate, (draft) => {
			draft.intervalDays = intervalDays;
			draft.repetitions += 1;
		});
		return { dueAt, nextState };
	}

	const intervalDays = clampIntervalDays(
		state.intervalDays *
			state.ease *
			params.easyBonus *
			params.intervalMultiplier,
		maxDays,
	);
	const dueAt = addMs(now, daysToMs(intervalDays));
	const nextState = updateState(state, baseUpdate, (draft) => {
		draft.intervalDays = intervalDays;
		draft.repetitions += 1;
		draft.ease = clampEase(
			state.ease + EASY_EASE_BONUS,
			params.minimumEase ?? 1.3,
		);
	});
	return { dueAt, nextState };
};

const applyRelearningPhase = (
	grade: ReviewGrade,
	ctx: ReviewContext,
): SchedulingResult<Sm2State> => {
	const { state, params, now, maxDays } = ctx;
	const stepsMs = params.relearningSteps.map((v) => safeParseDuration(v));
	const firstStepMs = stepsMs[0] ?? safeParseDuration(params.forgotInterval);
	const baseUpdate = createBaseUpdate(ctx);

	if (grade === "again") {
		const dueAt = addMs(now, firstStepMs);
		const nextState = updateState(state, baseUpdate, (draft) => {
			draft.stepIndex = 0;
		});
		return { dueAt, nextState };
	}

	if (grade === "hard") {
		const stepMs = stepsMs[state.stepIndex] ?? firstStepMs;
		const dueAt = addMs(now, stepMs);
		const nextState = updateState(state, baseUpdate);
		return { dueAt, nextState };
	}

	if (grade === "good") {
		const nextIndex = state.stepIndex + 1;
		if (nextIndex < stepsMs.length) {
			const dueAt = addMs(now, stepsMs[nextIndex]);
			const nextState = updateState(state, baseUpdate, (draft) => {
				draft.stepIndex = nextIndex;
			});
			return { dueAt, nextState };
		}
	}

	// Either easy in relearning or good on the final step graduates back to review.
	const pendingIntervalDays =
		state.pendingIntervalDays ??
		Math.max(1, (state.intervalDays || 1) * params.lapseIntervalMultiplier);
	const intervalDays = clampIntervalDays(pendingIntervalDays, maxDays);
	const dueAt = addMs(now, daysToMs(intervalDays));
	const nextState = updateState(state, baseUpdate, (draft) => {
		draft.phase = "review";
		draft.stepIndex = 0;
		draft.pendingIntervalDays = null;
		draft.intervalDays = intervalDays;
		draft.repetitions += 1;
	});
	return { dueAt, nextState };
};

export const sm2Scheduler: SchedulingAlgorithm<Sm2State, Sm2Parameters> = {
	key: "sm2",
	version: 1,
	applyReview: ({ previousState, review, params }) => {
		const now = review.reviewedAt;
		const minimumEase = params.minimumEase ?? 1.3;
		const state = previousState ?? initialState(params, now);
		const maxDays = msToDays(safeParseDuration(params.maxInterval));

		const ctx: ReviewContext = { state, params, now, maxDays };

		let result: SchedulingResult<Sm2State>;
		if (state.phase === "learning") {
			result = applyLearningPhase(review.grade, ctx);
		} else if (state.phase === "relearning") {
			result = applyRelearningPhase(review.grade, ctx);
		} else {
			result = applyReviewPhase(review.grade, ctx);
		}

		return {
			dueAt: result.dueAt,
			nextState: produce(result.nextState, (draft) => {
				draft.ease = clampEase(result.nextState.ease, minimumEase);
			}),
		};
	},
};
