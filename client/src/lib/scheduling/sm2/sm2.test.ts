import { daysToMs, safeParseDuration } from "@/lib/api/utils";
import {
	AGAIN_EASE_PENALTY,
	EASY_EASE_BONUS,
	HARD_EASE_PENALTY,
	HARD_INTERVAL_FACTOR,
} from "@/lib/scheduling/sm2/const";
import { normalizeSm2Parameters, sm2Scheduler } from "@/lib/scheduling/sm2/sm2";
import type { Sm2State } from "@/lib/scheduling/types";

const now = new Date("2024-01-01T00:00:00.000Z");
const defaultParams = normalizeSm2Parameters(null);

const createState = (overrides: Partial<Sm2State>): Sm2State => ({
	schema_version: 1,
	algorithm: "sm2",
	updated_at: now.toISOString(),
	phase: "learning",
	ease: defaultParams.startingEase,
	intervalDays: 0,
	repetitions: 0,
	lapses: 0,
	stepIndex: 0,
	pendingIntervalDays: null,
	lastReviewedAt: null,
	...overrides,
});

describe("sm2Scheduler", () => {
	it("initializes a new card in learning and schedules the first step on again", () => {
		const result = sm2Scheduler.applyReview({
			previousState: null,
			review: { grade: "again", reviewedAt: now },
			params: defaultParams,
		});

		expect(result.nextState.phase).toBe("learning");
		expect(result.nextState.stepIndex).toBe(0);
		expect(result.nextState.repetitions).toBe(0);
		expect(result.nextState.updated_at).toBe(now.toISOString());
		expect(result.dueAt.getTime()).toBe(
			now.getTime() + safeParseDuration(defaultParams.learningSteps[0]),
		);
	});

	it("progresses through learning steps on good and graduates after the final step", () => {
		const learningState = createState({});

		const nextStep = sm2Scheduler.applyReview({
			previousState: learningState,
			review: { grade: "good", reviewedAt: now },
			params: defaultParams,
		});

		expect(nextStep.nextState.phase).toBe("learning");
		expect(nextStep.nextState.stepIndex).toBe(1);
		expect(nextStep.nextState.repetitions).toBe(0);
		expect(nextStep.nextState.lapses).toBe(0);
		expect(nextStep.nextState.lastReviewedAt).toBe(now.toISOString());
		expect(nextStep.dueAt.getTime()).toBe(
			now.getTime() + safeParseDuration(defaultParams.learningSteps[1]),
		);

		const graduatingState = createState({
			phase: "learning",
			stepIndex: defaultParams.learningSteps.length - 1,
		});
		const graduation = sm2Scheduler.applyReview({
			previousState: graduatingState,
			review: { grade: "good", reviewedAt: now },
			params: defaultParams,
		});

		expect(graduation.nextState.phase).toBe("review");
		expect(graduation.nextState.repetitions).toBe(1);
		expect(graduation.nextState.intervalDays).toBe(1);
		expect(nextStep.nextState.lapses).toBe(0);
		expect(nextStep.nextState.lastReviewedAt).toBe(now.toISOString());
		expect(graduation.dueAt.getTime()).toBe(now.getTime() + daysToMs(1));
	});

	it("skips remaining steps on easy during learning and applies the ease bonus", () => {
		const learningState = createState({ phase: "learning", stepIndex: 0 });
		const result = sm2Scheduler.applyReview({
			previousState: learningState,
			review: { grade: "easy", reviewedAt: now },
			params: defaultParams,
		});

		expect(result.nextState.phase).toBe("review");
		expect(result.nextState.stepIndex).toBe(0);
		expect(result.nextState.repetitions).toBe(1);
		expect(result.nextState.ease).toBeCloseTo(
			defaultParams.startingEase + EASY_EASE_BONUS,
		);
		expect(result.nextState.intervalDays).toBe(
			safeParseDuration(defaultParams.easyInterval, "d"),
		);
		expect(result.dueAt.getTime()).toBe(
			now.getTime() +
				daysToMs(safeParseDuration(defaultParams.easyInterval, "d")),
		);
	});

	it("adjusts intervals and ease during review", () => {
		const reviewState = createState({
			phase: "review",
			intervalDays: 3,
			ease: 2.5,
			repetitions: 2,
		});

		const goodResult = sm2Scheduler.applyReview({
			previousState: reviewState,
			review: { grade: "good", reviewedAt: now },
			params: defaultParams,
		});

		expect(goodResult.nextState.intervalDays).toBeCloseTo(3 * 2.5);
		expect(goodResult.nextState.repetitions).toBe(3);
		expect(goodResult.dueAt.getTime()).toBeCloseTo(
			now.getTime() + daysToMs(3 * 2.5),
		);

		const hardResult = sm2Scheduler.applyReview({
			previousState: reviewState,
			review: { grade: "hard", reviewedAt: now },
			params: defaultParams,
		});

		expect(hardResult.nextState.intervalDays).toBeCloseTo(
			3 * HARD_INTERVAL_FACTOR,
		);
		expect(hardResult.nextState.ease).toBeCloseTo(
			reviewState.ease - HARD_EASE_PENALTY,
		);
		expect(hardResult.dueAt.getTime()).toBeCloseTo(
			now.getTime() + daysToMs(3 * HARD_INTERVAL_FACTOR),
		);
	});

	it("moves cards to relearning on again during review and clamps ease", () => {
		const reviewState = createState({
			phase: "review",
			intervalDays: 12,
			ease: 1.4,
			repetitions: 4,
		});

		const result = sm2Scheduler.applyReview({
			previousState: reviewState,
			review: { grade: "again", reviewedAt: now },
			params: defaultParams,
		});

		expect(result.nextState.phase).toBe("relearning");
		expect(result.nextState.pendingIntervalDays).toBeCloseTo(1.2);
		expect(result.nextState.ease).toBeCloseTo(
			Math.max(
				defaultParams.minimumEase ?? 1.3,
				reviewState.ease - AGAIN_EASE_PENALTY,
			),
		);
		expect(result.nextState.lapses).toBe(reviewState.lapses + 1);
		expect(result.dueAt.getTime()).toBe(
			now.getTime() + safeParseDuration(defaultParams.forgotInterval),
		);
	});

	it("progresses through relearning steps and returns to review", () => {
		const startRelearning = createState({
			phase: "relearning",
			stepIndex: 0,
			pendingIntervalDays: 3,
			intervalDays: 5,
		});

		const secondStep = sm2Scheduler.applyReview({
			previousState: startRelearning,
			review: { grade: "good", reviewedAt: now },
			params: defaultParams,
		});

		expect(secondStep.nextState.phase).toBe("relearning");
		expect(secondStep.nextState.stepIndex).toBe(1);
		expect(secondStep.dueAt.getTime()).toBe(
			now.getTime() + safeParseDuration(defaultParams.relearningSteps[1]),
		);

		const graduation = sm2Scheduler.applyReview({
			previousState: secondStep.nextState,
			review: { grade: "easy", reviewedAt: now },
			params: defaultParams,
		});

		expect(graduation.nextState.phase).toBe("review");
		expect(graduation.nextState.pendingIntervalDays).toBeNull();
		expect(graduation.nextState.intervalDays).toBeCloseTo(
			startRelearning.pendingIntervalDays ?? 0,
		);
		expect(graduation.nextState.repetitions).toBe(
			secondStep.nextState.repetitions + 1,
		);
		expect(graduation.dueAt.getTime()).toBe(
			now.getTime() + daysToMs(startRelearning.pendingIntervalDays ?? 0),
		);
	});

	it("clamps intervals to the configured maximum", () => {
		const params = normalizeSm2Parameters({ maxInterval: "10d" });
		const reviewState = createState({
			phase: "review",
			intervalDays: 50,
			ease: 3,
		});

		const result = sm2Scheduler.applyReview({
			previousState: reviewState,
			review: { grade: "easy", reviewedAt: now },
			params,
		});

		expect(result.nextState.intervalDays).toBe(10);
		expect(result.dueAt.getTime()).toBe(now.getTime() + daysToMs(10));
	});
});
