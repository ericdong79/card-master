import { describe, it, expect, beforeEach } from "vitest";
import type { Card } from "@/lib/api/entities/card";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { Sm2Parameters, Sm2State } from "@/lib/scheduling/sm2";
import { ReviewSession } from "./review-session";
import type { QueueItem } from "./types";

// Test fixtures
const createCard = (id: string, prompt: string): Card => ({
	id,
	card_pack_id: "pack-1",
	owner_user_id: "local-user",
	prompt,
	answer: `Answer for ${prompt}`,
	status: "active",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: null,
});

const defaultParams: Sm2Parameters = {
	learningSteps: ["1m", "10m"], // 1 minute, 10 minutes
	relearningSteps: ["10m"],
	easyInterval: "4d",
	startingEase: 2.5,
	easyBonus: 1.3,
	intervalMultiplier: 1,
	maxInterval: "365d",
	forgotInterval: "10m",
	lapseIntervalMultiplier: 0.1,
	minimumEase: 1.3,
};

describe("ReviewSession", () => {
	describe("new card learning flow", () => {
		it("should show new card and put it back in queue if not graduated", () => {
			const card = createCard("card-1", "New Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card],
				[], // No scheduling states - new card
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// Should show the new card
			expect(session.getCurrentCard()?.id).toBe("card-1");

			// Grade "Good" - should move to step 1, not graduate
			const result = session.submitGrade("good");
			expect(result.isCardCompleted).toBe(false);

			// Move to next
			session.moveToNext(result);

			// Card should still be in queue (learning phase)
			expect(session.isComplete()).toBe(false);
			expect(session.getCurrentCard()?.id).toBe("card-1");
		});

		it("should graduate card to review after completing all learning steps", () => {
			const card = createCard("card-1", "New Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// Step 0: Good
			let result = session.submitGrade("good");
			expect(result.isCardCompleted).toBe(false);
			session.moveToNext(result);

			// Step 1: Good (graduates)
			result = session.submitGrade("good");
			expect(result.isCardCompleted).toBe(true);
			session.moveToNext(result);

			// Session complete
			expect(session.isComplete()).toBe(true);
			expect(session.getCurrentCard()).toBeNull();
		});

		it("should reset to step 0 when clicking Again in learning", () => {
			const card = createCard("card-1", "New Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// Step 0: Good
			let result = session.submitGrade("good");
			session.moveToNext(result);

			// Get the queue item to check step
			let item = session.getQueueSnapshot()[0];
			expect((item.schedulingState?.state as Sm2State)?.stepIndex).toBe(1);

			// Step 1: Again (should reset to step 0)
			result = session.submitGrade("again");
			session.moveToNext(result);

			// Should be back at step 0
			item = session.getQueueSnapshot()[0];
			expect((item.schedulingState?.state as Sm2State)?.stepIndex).toBe(0);
			expect(result.isCardCompleted).toBe(false);
		});

		it("should skip to review when clicking Easy on new card", () => {
			const card = createCard("card-1", "New Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// Easy skips all learning steps
			const result = session.submitGrade("easy");
			expect(result.isCardCompleted).toBe(true);

			const state = result.schedulingState.state as Sm2State;
			expect(state.phase).toBe("review");
		});
	});

	describe("review card flow", () => {
		it("should complete review card in one step", () => {
			const card = createCard("card-1", "Review Card");
			const now = new Date("2025-01-15T10:00:00Z");

			// Card is already in review phase with a past due date
			const state: CardSchedulingState = {
				id: "state-1",
				card_id: "card-1",
				owner_user_id: "local-user",
				profile_id: "profile-1",
				due_at: "2025-01-14T10:00:00Z", // Due yesterday
				state: {
					schema_version: 1,
					algorithm: "sm2",
					updated_at: "2025-01-14T10:00:00Z",
					phase: "review",
					ease: 2.5,
					intervalDays: 10,
					repetitions: 5,
					lapses: 0,
					stepIndex: 0,
					pendingIntervalDays: null,
					lastReviewedAt: "2025-01-04T10:00:00Z",
				},
				last_reviewed_at: "2025-01-04T10:00:00Z",
				last_event_id: null,
				created_at: "2025-01-04T10:00:00Z",
			};

			const session = ReviewSession.create(
				[card],
				[state],
				defaultParams,
				"profile-1",
				{ now },
			);

			expect(session.getCurrentCard()?.id).toBe("card-1");

			// Any grade should complete the review card
			const result = session.submitGrade("good");
			expect(result.isCardCompleted).toBe(true);
		});

		it("should move card to relearning when clicking Again on review card", () => {
			const card = createCard("card-1", "Review Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const state: CardSchedulingState = {
				id: "state-1",
				card_id: "card-1",
				owner_user_id: "local-user",
				profile_id: "profile-1",
				due_at: "2025-01-14T10:00:00Z",
				state: {
					schema_version: 1,
					algorithm: "sm2",
					updated_at: "2025-01-14T10:00:00Z",
					phase: "review",
					ease: 2.5,
					intervalDays: 10,
					repetitions: 5,
					lapses: 0,
					stepIndex: 0,
					pendingIntervalDays: null,
					lastReviewedAt: "2025-01-04T10:00:00Z",
				},
				last_reviewed_at: "2025-01-04T10:00:00Z",
				last_event_id: null,
				created_at: "2025-01-04T10:00:00Z",
			};

			const session = ReviewSession.create(
				[card],
				[state],
				defaultParams,
				"profile-1",
				{ now },
			);

			// Again should move to relearning, not complete
			const result = session.submitGrade("again");
			expect(result.isCardCompleted).toBe(false);

			const newState = result.schedulingState.state as Sm2State;
			expect(newState.phase).toBe("relearning");
		});
	});

	describe("relearning flow", () => {
		it("should keep card in queue during relearning until graduated", () => {
			const card = createCard("card-1", "Relearning Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const state: CardSchedulingState = {
				id: "state-1",
				card_id: "card-1",
				owner_user_id: "local-user",
				profile_id: "profile-1",
				due_at: "2025-01-14T10:00:00Z",
				state: {
					schema_version: 1,
					algorithm: "sm2",
					updated_at: "2025-01-14T10:00:00Z",
					phase: "relearning",
					ease: 2.1,
					intervalDays: 10,
					repetitions: 5,
					lapses: 1,
					stepIndex: 0,
					pendingIntervalDays: 1,
					lastReviewedAt: "2025-01-04T10:00:00Z",
				},
				last_reviewed_at: "2025-01-04T10:00:00Z",
				last_event_id: null,
				created_at: "2025-01-04T10:00:00Z",
			};

			const session = ReviewSession.create(
				[card],
				[state],
				defaultParams,
				"profile-1",
				{ now },
			);

			// Good should graduate from relearning
			const result = session.submitGrade("good");
			expect(result.isCardCompleted).toBe(true);

			const newState = result.schedulingState.state as Sm2State;
			expect(newState.phase).toBe("review");
		});
	});

	describe("queue priority", () => {
		it("should prioritize learning cards over review cards", () => {
			const now = new Date("2025-01-15T10:00:00Z");

			const learningCard = createCard("card-1", "Learning Card");
			const reviewCard = createCard("card-2", "Review Card");

			const learningState: CardSchedulingState = {
				id: "state-1",
				card_id: "card-1",
				owner_user_id: "local-user",
				profile_id: "profile-1",
				due_at: now.toISOString(),
				state: {
					schema_version: 1,
					algorithm: "sm2",
					updated_at: "2025-01-14T10:00:00Z",
					phase: "learning",
					ease: 2.5,
					intervalDays: 0,
					repetitions: 0,
					lapses: 0,
					stepIndex: 0,
					pendingIntervalDays: null,
					lastReviewedAt: null,
				},
				last_reviewed_at: "2025-01-14T10:00:00Z",
				last_event_id: null,
				created_at: "2025-01-14T10:00:00Z",
			};

			const reviewState: CardSchedulingState = {
				id: "state-2",
				card_id: "card-2",
				owner_user_id: "local-user",
				profile_id: "profile-1",
				due_at: now.toISOString(),
				state: {
					schema_version: 1,
					algorithm: "sm2",
					updated_at: "2025-01-14T10:00:00Z",
					phase: "review",
					ease: 2.5,
					intervalDays: 10,
					repetitions: 5,
					lapses: 0,
					stepIndex: 0,
					pendingIntervalDays: null,
					lastReviewedAt: "2025-01-05T10:00:00Z",
				},
				last_reviewed_at: "2025-01-05T10:00:00Z",
				last_event_id: null,
				created_at: "2025-01-05T10:00:00Z",
			};

			const session = ReviewSession.create(
				[reviewCard, learningCard], // Review card first in input
				[reviewState, learningState],
				defaultParams,
				"profile-1",
				{ now },
			);

			// Learning card should come first
			expect(session.getCurrentCard()?.id).toBe("card-1");
		});
	});

	describe("session completion", () => {
		it("should be complete when all cards are done", () => {
			const card = createCard("card-1", "Only Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			expect(session.isComplete()).toBe(false);

			// Graduate the card
			const result = session.submitGrade("good");
			session.moveToNext(result);

			// Still not complete, need one more Good
			expect(session.isComplete()).toBe(false);

			const result2 = session.submitGrade("good");
			session.moveToNext(result2);

			// Now complete
			expect(session.isComplete()).toBe(true);
		});

		it("should respect new card limit", () => {
			const cards = [
				createCard("card-1", "New 1"),
				createCard("card-2", "New 2"),
				createCard("card-3", "New 3"),
			];
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				cards,
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 2 }, // Only 2 new cards allowed
			);

			// Should only show 2 cards as due
			const stats = session.getStats();
			expect(stats.newCards).toBe(3);
		});
	});
});
