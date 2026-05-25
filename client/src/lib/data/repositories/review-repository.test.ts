import { describe, expect, it, vi } from "vitest";

import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewResult } from "@/lib/review";
import type { Sm2State } from "@/lib/scheduling/types";

import { createRepositoryTestDb } from "./repository-test-utils";
import { createReviewRepository } from "./review-repository";

const accountUserId = "account-1";
const profileId = "profile-1";
const reviewedAt = "2026-01-02T00:00:00.000Z";
const nextDueAt = "2026-01-03T00:00:00.000Z";

const nextSm2State: Sm2State = {
	schema_version: 1,
	algorithm: "sm2",
	updated_at: reviewedAt,
	phase: "learning",
	ease: 2.5,
	intervalDays: 1,
	repetitions: 1,
	lapses: 0,
	stepIndex: 0,
	pendingIntervalDays: null,
	lastReviewedAt: reviewedAt,
};

function reviewResult(cardId = "card-1"): ReviewResult {
	return {
		reviewEvent: {
			card_id: cardId,
			owner_user_id: profileId,
			account_user_id: accountUserId,
			profile_id: profileId,
			grade: 3,
			time_ms: 1200,
			raw_payload: { source: "test" },
			reviewed_at: reviewedAt,
		},
		schedulingState: {
			owner_user_id: profileId,
			account_user_id: accountUserId,
			learner_profile_id: profileId,
			card_id: cardId,
			profile_id: "schedule-profile-1",
			due_at: nextDueAt,
			state: nextSm2State,
			last_reviewed_at: reviewedAt,
			last_event_id: null,
		},
		isCardCompleted: true,
		nextDueAt: new Date(nextDueAt),
	};
}

describe("createReviewRepository", () => {
	it("persists review event, scheduling state, mastery state, and daily progress", async () => {
		const db = createRepositoryTestDb();
		const ids = ["review-event-1", "schedule-state-1", "mastery-state-1"];
		const notifyDailyProgress = vi.fn();
		const repository = createReviewRepository({
			db,
			generateId: () => ids.shift() ?? "extra-id",
			now: () => "2026-01-02T00:00:01.000Z",
			notifyDailyProgress,
		});

		const persisted = await repository.persistReviewResult({
			accountUserId,
			profileId,
			grade: "good",
			result: reviewResult(),
			existingState: null,
		});

		expect(db.review_event).toEqual([
			{
				id: "review-event-1",
				card_id: "card-1",
				owner_user_id: profileId,
				account_user_id: accountUserId,
				profile_id: profileId,
				grade: 3,
				time_ms: 1200,
				raw_payload: { source: "test" },
				reviewed_at: reviewedAt,
				created_at: "2026-01-02T00:00:01.000Z",
			},
		]);
		expect(db.card_scheduling_state).toEqual([
			{
				id: "schedule-state-1",
				owner_user_id: profileId,
				account_user_id: accountUserId,
				learner_profile_id: profileId,
				card_id: "card-1",
				profile_id: "schedule-profile-1",
				due_at: nextDueAt,
				state: nextSm2State,
				last_reviewed_at: reviewedAt,
				last_event_id: "review-event-1",
				created_at: "2026-01-02T00:00:01.000Z",
			},
		]);
		expect(db.card_mastery_state).toEqual([
			{
				id: "mastery-state-1",
				owner_user_id: profileId,
				account_user_id: accountUserId,
				profile_id: profileId,
				card_id: "card-1",
				mastery_score: 6,
				mastery_state: "learning",
				easy_streak: 0,
				recent_outcomes: [true],
				created_at: "2026-01-02T00:00:01.000Z",
				updated_at: "2026-01-02T00:00:01.000Z",
			},
		]);
		expect(persisted.masteryFeedback).toEqual({
			cardId: "card-1",
			transition: {
				beforeScore: 0,
				afterScore: 6,
				beforeState: "unseen",
				afterState: "learning",
				delta: 6,
			},
			rating: "good",
			isFirstLearn: true,
		});
		expect(notifyDailyProgress).toHaveBeenCalledWith({
			accountUserId,
			profileId,
			completedDelta: 1,
		});
	});

	it("updates only the matching profile mastery state and skips progress for again", async () => {
		const existingState: CardSchedulingState = {
			id: "schedule-state-1",
			owner_user_id: profileId,
			account_user_id: accountUserId,
			learner_profile_id: profileId,
			card_id: "card-1",
			profile_id: "schedule-profile-1",
			due_at: "2026-01-01T00:00:00.000Z",
			state: { ...nextSm2State, phase: "review" },
			last_reviewed_at: "2026-01-01T00:00:00.000Z",
			last_event_id: "old-event",
			created_at: "2026-01-01T00:00:00.000Z",
		};
		const db = createRepositoryTestDb({
			card_scheduling_state: [existingState],
			card_mastery_state: [
				{
					id: "mastery-state-1",
					owner_user_id: profileId,
					account_user_id: accountUserId,
					profile_id: profileId,
					card_id: "card-1",
					mastery_score: 50,
					mastery_state: "reviewing",
					easy_streak: 2,
					recent_outcomes: [true, true],
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
				},
				{
					id: "other-profile-mastery",
					owner_user_id: "profile-2",
					account_user_id: accountUserId,
					profile_id: "profile-2",
					card_id: "card-1",
					mastery_score: 90,
					mastery_state: "mastered",
					easy_streak: 5,
					recent_outcomes: [true, true, true],
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
				},
			],
		});
		const notifyDailyProgress = vi.fn();
		const repository = createReviewRepository({
			db,
			generateId: () => "review-event-1",
			now: () => "2026-01-02T00:00:01.000Z",
			notifyDailyProgress,
		});

		await repository.persistReviewResult({
			accountUserId,
			profileId,
			grade: "again",
			result: reviewResult(),
			existingState,
		});

		expect(db.card_scheduling_state[0]).toMatchObject({
			id: "schedule-state-1",
			last_event_id: "review-event-1",
		});
		expect(db.card_mastery_state).toEqual([
			{
				id: "mastery-state-1",
				owner_user_id: profileId,
				account_user_id: accountUserId,
				profile_id: profileId,
				card_id: "card-1",
				mastery_score: 36,
				mastery_state: "learning",
				easy_streak: 0,
				recent_outcomes: [true, true, false],
				created_at: "2026-01-01T00:00:00.000Z",
				updated_at: "2026-01-02T00:00:01.000Z",
			},
			{
				id: "other-profile-mastery",
				owner_user_id: "profile-2",
				account_user_id: accountUserId,
				profile_id: "profile-2",
				card_id: "card-1",
				mastery_score: 90,
				mastery_state: "mastered",
				easy_streak: 5,
				recent_outcomes: [true, true, true],
				created_at: "2026-01-01T00:00:00.000Z",
				updated_at: "2026-01-01T00:00:00.000Z",
			},
		]);
		expect(notifyDailyProgress).not.toHaveBeenCalled();
	});
});
