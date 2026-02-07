import { describe, it, expect } from "vitest";
import type { Card } from "@/lib/api/entities/card";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { Sm2Parameters } from "@/lib/scheduling/types/sm2-types";
import { ReviewSession } from "./review-session";

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
	learningSteps: ["1m", "10m"],
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

describe("ReviewSession (Simplified)", () => {
	describe("basic review flow", () => {
		it("should show card once and complete if rated Good", () => {
			const card = createCard("card-1", "New Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// Should show the card
			expect(session.getCurrentCard()?.id).toBe("card-1");

			// Rate Good
			const result = session.submitGrade("good");
			expect(result.isCardCompleted).toBe(true);

			session.moveToNext(result, "good");

			// Session should be complete - card doesn't need to graduate
			expect(session.isComplete()).toBe(true);
			expect(session.getCurrentCard()).toBeNull();
		});

		it("should re-show card immediately if rated Again", () => {
			const card = createCard("card-1", "New Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// First showing - rate Again
			let result = session.submitGrade("again");
			expect(result.isCardCompleted).toBe(false);

			session.moveToNext(result, "again");

			// Card should still be available (Again cards are re-shown)
			expect(session.isComplete()).toBe(false);
			expect(session.getCurrentCard()?.id).toBe("card-1");

			// Second showing - rate Good
			result = session.submitGrade("good");
			session.moveToNext(result, "good");

			// Now session is complete
			expect(session.isComplete()).toBe(true);
		});

		it("should handle multiple cards with mixed ratings", () => {
			const card1 = createCard("card-1", "Card 1");
			const card2 = createCard("card-2", "Card 2");
			const card3 = createCard("card-3", "Card 3");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card1, card2, card3],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// Review all 3 cards
			for (let i = 0; i < 3; i++) {
				const card = session.getCurrentCard();
				expect(card).not.toBeNull();

				const result = session.submitGrade("good");
				session.moveToNext(result, "good");
			}

			// Session complete after reviewing each card once
			expect(session.isComplete()).toBe(true);
			expect(session.getStats().completedCards).toBe(3);
		});
	});

	describe("Again cards handling", () => {
		it("should track cards rated Again for re-review", () => {
			const card1 = createCard("card-1", "Easy Card");
			const card2 = createCard("card-2", "Hard Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card1, card2],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// First card - Good
			let result = session.submitGrade("good");
			session.moveToNext(result, "good");

			// Second card - Again
			result = session.submitGrade("again");
			session.moveToNext(result, "again");

			// Should have 1 card in Again list
			const againCards = session.getAgainCards();
			expect(againCards.length).toBe(1);
			expect(againCards[0].id).toBe("card-2");

			// Current card should be the Again card
			expect(session.getCurrentCard()?.id).toBe("card-2");
		});

		it("should allow multiple Again attempts until success", () => {
			const card = createCard("card-1", "Difficult Card");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			// Rate Again 3 times
			for (let i = 0; i < 3; i++) {
				expect(session.getCurrentCard()?.id).toBe("card-1");
				const result = session.submitGrade("again");
				session.moveToNext(result, "again");
			}

			// Still showing the card
			expect(session.getCurrentCard()?.id).toBe("card-1");

			// Finally rate Good
			const result = session.submitGrade("good");
			session.moveToNext(result, "good");

			// Now complete
			expect(session.isComplete()).toBe(true);
		});
	});

	describe("review cards", () => {
		it("should complete review card in one step", () => {
			const card = createCard("card-1", "Review Card");
			const now = new Date("2025-01-15T10:00:00Z");

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

			// Any grade completes the review
			const result = session.submitGrade("hard");
			session.moveToNext(result, "hard");

			expect(session.isComplete()).toBe(true);
		});

		it("should put lapsed card in relearning but not require graduation", () => {
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

			// Rate Again - card goes to relearning
			const result = session.submitGrade("again");
			expect(result.isCardCompleted).toBe(false);

			session.moveToNext(result, "again");

			// Card is in relearning but since we rated Again, it stays in queue
			expect(session.isComplete()).toBe(false);
			expect(session.getCurrentCard()?.id).toBe("card-1");

			// Rate Good - completes even though not graduated from relearning
			const result2 = session.submitGrade("good");
			session.moveToNext(result2, "good");

			// Session complete - card moves to next relearning step for next session
			expect(session.isComplete()).toBe(true);
		});
	});

	describe("new card limit", () => {
		it("should respect new card daily limit", () => {
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
				{ now, newCardsLimit: 2 },
			);

			// Should only show 2 new cards
			const seen = new Set<string>();
			while (true) {
				const card = session.getCurrentCard();
				if (!card) break;
				seen.add(card.id);

				const result = session.submitGrade("good");
				session.moveToNext(result, "good");
			}

			expect(seen.size).toBe(2);
		});
	});

	describe("session stats", () => {
		it("should report correct statistics", () => {
			const card1 = createCard("card-1", "Card 1");
			const card2 = createCard("card-2", "Card 2");
			const now = new Date("2025-01-15T10:00:00Z");

			const session = ReviewSession.create(
				[card1, card2],
				[],
				defaultParams,
				"profile-1",
				{ now, newCardsLimit: 10 },
			);

			let stats = session.getStats();
			expect(stats.totalCards).toBe(2);
			expect(stats.completedCards).toBe(0);
			expect(stats.newCards).toBe(2);

			// Complete first card
			const result1 = session.submitGrade("good");
			session.moveToNext(result1, "good");

			stats = session.getStats();
			expect(stats.completedCards).toBe(1);
			expect(stats.remainingCards).toBe(1);

			// Complete second card
			const result2 = session.submitGrade("easy");
			session.moveToNext(result2, "easy");

			stats = session.getStats();
			expect(stats.completedCards).toBe(2);
			expect(stats.remainingCards).toBe(0);
		});
	});
});
