import type { Card } from "@/lib/api/entities/card";
import type {
	CardSchedulingState,
} from "@/lib/api/entities/card-scheduling-state";
import type { CardSchedulingStateInsert } from "@/lib/api/dtos/card-scheduling-state";
import type { ReviewEventInsert } from "@/lib/api/dtos/review-event";


/**
 * Queue phase for a card in the review session.
 * - new: never reviewed before
 * - learning: in learning steps
 * - review: graduated, normal review interval
 * - relearning: lapsed, going through relearning steps
 */
export type QueuePhase = "new" | "learning" | "review" | "relearning";

/**
 * An item in the review queue.
 */
export interface QueueItem {
	card: Card;
	schedulingState: CardSchedulingState | null;
	phase: QueuePhase;
	scheduledAt: Date;
	isCompleted: boolean;
}

/**
 * Result of submitting a grade for the current card.
 */
export interface ReviewResult {
	reviewEvent: ReviewEventInsert;
	schedulingState: CardSchedulingStateInsert;
	isCardCompleted: boolean;
	nextDueAt: Date;
}

/**
 * Statistics for the current review session.
 */
export interface SessionStats {
	totalCards: number;
	completedCards: number;
	remainingCards: number;
	newCards: number;
	learningCards: number;
	reviewCards: number;
	relearningCards: number;
}

/**
 * Options for creating a review session.
 */
export interface ReviewSessionOptions {
	/** Maximum number of new cards to show in this session */
	newCardsLimit?: number;
	/** Current time (for testing) */
	now?: Date;
	/** Active owner/profile id */
	ownerUserId?: string;
}
