import { describe, expect, it } from "vitest";
import type { Sm2State } from "@/lib/scheduling/types";
import { computeMasteryUpdate } from "./mastery-model";

const reviewState = (intervalDays: number): Sm2State => ({
	schema_version: 1,
	algorithm: "sm2",
	phase: "review",
	ease: 2.5,
	intervalDays,
	repetitions: 5,
	lapses: 0,
	stepIndex: 0,
	pendingIntervalDays: null,
	lastReviewedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
	updated_at: new Date("2026-01-01T00:00:00.000Z").toISOString(),
});

describe("computeMasteryUpdate", () => {
	it("starts from unseen and moves to learning with positive score", () => {
		const now = new Date("2026-01-01T00:00:00.000Z");
		const result = computeMasteryUpdate({
			existing: null,
			ownerUserId: "u1",
			accountUserId: "a1",
			profileId: "u1",
			cardId: "c1",
			grade: "good",
			now,
			nextDueAt: new Date("2026-01-08T00:00:00.000Z"),
			previousSm2State: null,
			nextSm2State: { ...reviewState(1), phase: "learning", repetitions: 0 },
		});

		expect(result.transition.beforeState).toBe("unseen");
		expect(result.nextMastery.mastery_state).toBe("learning");
		expect(result.nextMastery.mastery_score).toBeGreaterThan(0);
		expect(result.isFirstLearn).toBe(true);
	});

	it("becomes mastered when easy streak, long interval, and accuracy pass thresholds", () => {
		const now = new Date("2026-01-01T00:00:00.000Z");
		const result = computeMasteryUpdate({
			existing: {
				id: "m1",
				owner_user_id: "u1",
				account_user_id: "a1",
				profile_id: "u1",
				card_id: "c1",
				mastery_score: 86,
				mastery_state: "reviewing",
				easy_streak: 2,
				recent_outcomes: [true, true, true, true, true, true, true, true, true],
				created_at: now.toISOString(),
				updated_at: now.toISOString(),
			},
			ownerUserId: "u1",
			accountUserId: "a1",
			profileId: "u1",
			cardId: "c1",
			grade: "easy",
			now,
			nextDueAt: new Date("2026-05-01T00:00:00.000Z"),
			previousSm2State: reviewState(40),
			nextSm2State: reviewState(120),
		});

		expect(result.nextMastery.mastery_state).toBe("mastered");
		expect(result.nextMastery.mastery_score).toBe(100);
		expect(result.nextMastery.easy_streak).toBe(3);
	});

	it("penalizes overdue again and clamps score to 0", () => {
		const now = new Date("2026-02-01T00:00:00.000Z");
		const result = computeMasteryUpdate({
			existing: {
				id: "m1",
				owner_user_id: "u1",
				account_user_id: "a1",
				profile_id: "u1",
				card_id: "c1",
				mastery_score: 6,
				mastery_state: "reviewing",
				easy_streak: 1,
				recent_outcomes: [true, false, true],
				created_at: now.toISOString(),
				updated_at: now.toISOString(),
			},
			ownerUserId: "u1",
			accountUserId: "a1",
			profileId: "u1",
			cardId: "c1",
			grade: "again",
			now,
			previousDueAt: new Date("2026-01-01T00:00:00.000Z"),
			nextDueAt: new Date("2026-02-01T00:10:00.000Z"),
			previousSm2State: reviewState(20),
			nextSm2State: { ...reviewState(1), phase: "relearning", repetitions: 0 },
		});

		expect(result.nextMastery.mastery_score).toBe(0);
		expect(result.nextMastery.mastery_state).toBe("learning");
		expect(result.transition.delta).toBeLessThan(0);
	});
});
