import type {
	ReviewGrade,
	SchedulingAlgorithm,
	SchedulingResult,
} from "./types";

type DurationSpec = string | number;

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

const addDefaultDurationUnit = (spec: DurationSpec): DurationSpec => {
	if (typeof spec === "string") {
		const trimmed = spec.trim();
		if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
			return `${trimmed}d`;
		}
	}
	return spec;
};

export const normalizeSm2Parameters = (
	params: Partial<Sm2Parameters> | null | undefined,
): Sm2Parameters => {
	const merged: Sm2Parameters = {
		...SM2_DEFAULT_PARAMETERS,
		...(params ?? {}),
	};

	return {
		...merged,
		learningSteps: merged.learningSteps.map(addDefaultDurationUnit),
		relearningSteps: merged.relearningSteps.map(addDefaultDurationUnit),
		easyInterval: addDefaultDurationUnit(merged.easyInterval),
		maxInterval: addDefaultDurationUnit(merged.maxInterval),
		forgotInterval: addDefaultDurationUnit(merged.forgotInterval),
	};
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

export const SM2_DEFAULT_PARAMETERS: Sm2Parameters = {
	learningSteps: ["1d", "2d"],
	easyInterval: "4d",
	startingEase: 2.3,
	easyBonus: 1.3,
	intervalMultiplier: 1,
	maxInterval: "1825d",
	forgotInterval: "1m",
	relearningSteps: ["1d", "4d"],
	lapseIntervalMultiplier: 0.1,
	minimumEase: 1.3,
};

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const HARD_INTERVAL_FACTOR = 1.2;
const AGAIN_EASE_PENALTY = 0.2;
const HARD_EASE_PENALTY = 0.15;
const EASY_EASE_BONUS = 0.15;

const durationMs = (spec: DurationSpec): number => {
	if (typeof spec === "number" && Number.isFinite(spec)) {
		return spec * MS_IN_DAY;
	}

	if (typeof spec !== "string") {
		throw new Error("Unsupported duration spec");
	}

	const parts = spec
		.trim()
		.split(/(?=[-+]?\d)/)
		.map((p) => p.trim())
		.filter(Boolean);

	if (parts.length === 0) {
		throw new Error(`Invalid duration string: ${spec}`);
	}

	let totalMs = 0;
	for (const part of parts) {
		const match = part.match(/^(-?\d+(?:\.\d+)?)([mhd])$/i);
		if (!match) {
			throw new Error(`Invalid duration component: ${part}`);
		}
		const [, amountRaw, unitRaw] = match;
		const amount = parseFloat(amountRaw);
		const unit = unitRaw.toLowerCase();
		const unitMs =
			unit === "m"
				? 1000 * 60
				: unit === "h"
					? 1000 * 60 * 60
					: MS_IN_DAY;
		totalMs += amount * unitMs;
	}
	return totalMs;
};

const msToDays = (ms: number): number => ms / MS_IN_DAY;
const daysToMs = (days: number): number => days * MS_IN_DAY;

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
	const stepsMs = params.learningSteps.map(durationMs);
	const firstStepMs = stepsMs[0] ?? durationMs("1d");

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
	const easyDays = msToDays(durationMs(params.easyInterval));
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
			ease: clampEase(
				state.ease + EASY_EASE_BONUS,
				params.minimumEase ?? 1.3,
			),
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
		const dueAt = new Date(now.getTime() + durationMs(params.forgotInterval));
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
		state.intervalDays * state.ease * params.easyBonus * params.intervalMultiplier,
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
				state.ease + EASY_EASE_BONUS,
				params.minimumEase ?? 1.3,
			),
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
	const stepsMs = params.relearningSteps.map(durationMs);
	const firstStepMs = stepsMs[0] ?? durationMs(params.forgotInterval);

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
		const maxDays = msToDays(durationMs(params.maxInterval));

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
