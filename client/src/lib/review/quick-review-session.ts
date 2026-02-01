import type { Card } from "@/lib/api/entities/card";

import type { ReviewEventInsert } from "@/lib/api/entities/review-event";
import { LOCAL_OWNER_ID } from "@/lib/api/local-user";


/**
 * Simple review result - only two options
 */
export type SimpleReviewResult = "forgot" | "remembered";

/**
 * Maps simple result to numeric grade for event recording
 */
const SIMPLE_RESULT_TO_GRADE: Record<SimpleReviewResult, number> = {
	forgot: 1, // Maps to Again
	remembered: 3, // Maps to Good
};

/**
 * Result of a simple review
 */
export interface QuickReviewResult {
	/** The result of the review */
	result: SimpleReviewResult;
	/** Review event for persistence (optional) */
	reviewEvent?: ReviewEventInsert;
	/** Whether the card is completed for this session */
	isCompleted: boolean;
}

/**
 * Statistics for quick review session
 */
export interface QuickReviewStats {
	totalCards: number;
	completedCards: number;
	forgotCount: number;
	rememberedCount: number;
}

/**
 * QuickReviewSession - Simplified review mode
 * 
 * Features:
 * - Only two buttons: Forgot / Remembered
 * - Does NOT affect card's scheduling state (no SM-2 updates)
 * - Does NOT calculate due dates
 * - Optional: Records review events for statistics (but doesn't affect scheduling)
 * - Cards rated "Forgot" are re-shown immediately
 * - Cards rated "Remembered" are session-completed
 * 
 * Use cases:
 * - Preview cards before a test
 * - Quick review when no cards are due
 * - Self-testing without affecting SRS schedule
 */
export class QuickReviewSession {
	private cards: Card[];
	private currentIndex: number;
	private completedIds: Set<string>;
	private forgotCardIds: Set<string>;
	private readonly ownerUserId: string;
	private readonly cardPackId: string;
	private readonly recordEvents: boolean;

	constructor(
		cards: Card[],
		cardPackId: string,
		options: { recordEvents?: boolean } = {},
	) {
		this.cards = [...cards];
		this.currentIndex = 0;
		this.completedIds = new Set();
		this.forgotCardIds = new Set();
		this.ownerUserId = LOCAL_OWNER_ID;
		this.cardPackId = cardPackId;
		this.recordEvents = options.recordEvents ?? false;
	}

	/**
   * Factory method to create a QuickReviewSession
   */
	static create(
		cards: Card[],
		cardPackId: string,
		options?: { recordEvents?: boolean },
	): QuickReviewSession {
		return new QuickReviewSession(cards, cardPackId, options);
	}

	/**
   * Gets the current card to review
   */
	getCurrentCard(): Card | null {
		// First check for cards rated "Forgot" that need re-review
		for (const card of this.cards) {
			if (this.forgotCardIds.has(card.id) && !this.completedIds.has(card.id)) {
				return card;
			}
		}

		// Then check current position
		while (this.currentIndex < this.cards.length) {
			const card = this.cards[this.currentIndex];
			if (!this.completedIds.has(card.id)) {
				return card;
			}
			this.currentIndex++;
		}

		return null;
	}

	/**
   * Submits a review result for the current card
   */
	submitReview(result: SimpleReviewResult): QuickReviewResult {
		const card = this.getCurrentCard();
		if (!card) {
			throw new Error("No current card to review");
		}

		// Create review event if recording is enabled
		let reviewEvent: ReviewEventInsert | undefined;
		if (this.recordEvents) {
			reviewEvent = {
				card_id: card.id,
				owner_user_id: this.ownerUserId,
				grade: SIMPLE_RESULT_TO_GRADE[result],
				time_ms: 0,
				raw_payload: { mode: "quick_review", result },
				reviewed_at: new Date().toISOString(),
			};
		}

		return {
			result,
			reviewEvent,
			isCompleted: result === "remembered",
		};
	}

	/**
   * Moves to the next card after a review
   */
	moveToNext(reviewResult: QuickReviewResult): void {
		const card = this.getCurrentCard();
		if (!card) return;

		if (reviewResult.result === "forgot") {
			// Mark for re-review
			this.forgotCardIds.add(card.id);
			// Move to next position (forgot card will be picked up by getCurrentCard)
			this.currentIndex++;
		} else {
			// Remembered - mark as completed
			this.forgotCardIds.delete(card.id);
			this.completedIds.add(card.id);
			this.currentIndex++;
		}
	}

	/**
   * Checks if the session is complete
   */
	isComplete(): boolean {
		return this.getCurrentCard() === null;
	}

	/**
   * Gets statistics for the session
   */
	getStats(): QuickReviewStats {
		const stats: QuickReviewStats = {
			totalCards: this.cards.length,
			completedCards: this.completedIds.size,
			forgotCount: 0,
			rememberedCount: 0,
		};

		// Note: These counts would need to be tracked during the session
		// For now, we just return basic stats
		return stats;
	}

	/**
   * Gets the number of cards remaining in this session
   */
	getRemainingCount(): number {
		return this.cards.length - this.completedIds.size;
	}

	/**
   * Gets the current position (1-based)
   */
	getPosition(): { current: number; total: number } {
		const total = this.cards.length;
		const current = Math.min(this.completedIds.size + 1, total);
		return { current, total };
	}

	/**
   * Gets cards that were rated "Forgot" and may need more study
   */
	getForgotCards(): Card[] {
		return this.cards.filter((card) =>
			this.forgotCardIds.has(card.id),
		);
	}

	/**
   * Skip the current card (mark as completed without reviewing)
   */
	skipCurrent(): void {
		const card = this.getCurrentCard();
		if (card) {
			this.completedIds.add(card.id);
			this.currentIndex++;
		}
	}
}
