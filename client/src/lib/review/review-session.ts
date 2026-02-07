import type { Card } from "@/lib/api/entities/card";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { CardSchedulingStateInsert } from "@/lib/api/dtos/card-scheduling-state";
import type { ReviewEventInsert } from "@/lib/api/dtos/review-event";
import { LOCAL_OWNER_ID } from "@/lib/api/local-user";
import { generateId, nowIso } from "@/lib/api/utils";
import {
	normalizeSm2Parameters,
	sm2Scheduler,
} from "@/lib/scheduling/sm2";
import type { Sm2Parameters, Sm2State } from "@/lib/scheduling/types/sm2-types";
import type { ReviewGrade } from "@/lib/scheduling/types";
import type {
	QueueItem,
	QueuePhase,
	ReviewResult,
	ReviewSessionOptions,
	SessionStats,
} from "./types";

/**
 * Maps a review grade to its numeric value.
 */
const REVIEW_GRADE_TO_VALUE: Record<ReviewGrade, number> = {
	again: 1,
	hard: 2,
	good: 3,
	easy: 4,
};

/**
 * Determines the queue phase based on SM2 state.
 */
function getQueuePhase(state: Sm2State | null): QueuePhase {
	if (!state) return "new";
	return state.phase;
}

/**
 * ReviewSession manages the state and logic of a review session.
 *
 * SIMPLIFIED MODEL:
 * - Each card appears at most ONCE per session (unless rated "Again")
 * - "Again" → card goes back to queue for immediate re-review
 * - "Hard/Good/Easy" → card is "session-completed", next review in future
 * - Session ends when no cards are due for immediate review
 *
 * This is more user-friendly than requiring full graduation in one session.
 */
export class ReviewSession {
	private items: QueueItem[];
	private completedIds: Set<string>; // Cards completed in this session
	private againCardIds: Set<string>; // Cards that need re-review (rated Again)
	private newCardsSeen: number;
	private readonly newCardsLimit: number;
	private readonly params: Sm2Parameters;
	private readonly now: Date;
	private readonly ownerUserId: string;
	private readonly profileId: string;

	constructor(
		items: QueueItem[],
		params: Sm2Parameters,
		profileId: string,
		options: ReviewSessionOptions = {},
	) {
		this.items = this.sortQueue(items);
		this.completedIds = new Set();
		this.againCardIds = new Set();
		this.newCardsSeen = 0;
		this.newCardsLimit = options.newCardsLimit ?? 20;
		this.params = normalizeSm2Parameters(params);
		this.now = options.now ?? new Date();
		this.ownerUserId = LOCAL_OWNER_ID;
		this.profileId = profileId;
	}

	/**
   * Factory method to create a ReviewSession from cards and scheduling states.
   */
	static create(
		cards: Card[],
		states: CardSchedulingState[],
		params: Sm2Parameters,
		profileId: string,
		options?: ReviewSessionOptions,
	): ReviewSession {
		const stateMap = new Map(states.map((s) => [s.card_id, s]));
		const now = options?.now ?? new Date();

		const items: QueueItem[] = cards.map((card) => {
			const state = stateMap.get(card.id) ?? null;
			const sm2State = state?.state as Sm2State | null;
			const phase = getQueuePhase(sm2State);

			// For new cards, treat them as due now
			const scheduledAt = state?.due_at
				? new Date(state.due_at)
				: now;

			return {
				card,
				schedulingState: state,
				phase,
				scheduledAt,
				isCompleted: false,
			};
		});

		return new ReviewSession(items, params, profileId, options);
	}

	/**
   * Sorts queue items by priority for display.
   * Priority: Again cards > Learning/Relearning > Review > New
   */
	private sortQueue(items: QueueItem[]): QueueItem[] {
		const phasePriority: Record<QueuePhase, number> = {
			learning: 0,
			relearning: 0,
			review: 1,
			new: 2,
		};

		return [...items].sort((a, b) => {
			// Completed cards go to the end
			if (a.isCompleted !== b.isCompleted) {
				return a.isCompleted ? 1 : -1;
			}

			// Compare phase priority
			const priorityDiff = phasePriority[a.phase] - phasePriority[b.phase];
			if (priorityDiff !== 0) return priorityDiff;

			// Sort by scheduled time
			return a.scheduledAt.getTime() - b.scheduledAt.getTime();
		});
	}

	/**
   * Gets the next card to review in this session.
   *
   * A card is "due" in this session if:
   * 1. Not yet completed in this session
   * 2. Scheduled time <= now (already due)
   * 3. For new cards: within daily quota
   *
   * Cards rated "Again" are immediately re-shown.
   */
	getCurrentCard(): Card | null {
		for (const item of this.items) {
			// Skip completed cards
			if (item.isCompleted) continue;

			// Cards rated "Again" are always shown immediately
			if (this.againCardIds.has(item.card.id)) {
				return item.card;
			}

			// Check new card quota (only for cards that started as new)
			if (item.phase === "new" && this.newCardsSeen >= this.newCardsLimit) {
				continue;
			}

			// Other cards: show if scheduled time <= now
			if (item.scheduledAt.getTime() <= this.now.getTime()) {
				return item.card;
			}
		}
		return null;
	}

	/**
   * Gets the current queue item.
   */
	private getCurrentItem(): QueueItem | null {
		for (const item of this.items) {
			if (item.isCompleted) continue;
			if (this.againCardIds.has(item.card.id)) return item;
			if (item.phase === "new" && this.newCardsSeen >= this.newCardsLimit) continue;
			if (item.scheduledAt.getTime() <= this.now.getTime()) return item;
		}
		return null;
	}

	/**
   * Submits a grade for the current card.
   */
	submitGrade(grade: ReviewGrade): ReviewResult {
		const item = this.getCurrentItem();
		if (!item) {
			throw new Error("No current card to grade");
		}

		const card = item.card;
		const existingState = item.schedulingState;
		const previousSm2State = (existingState?.state as Sm2State) ?? null;

		// Apply scheduling algorithm
		const { nextState, dueAt } = sm2Scheduler.applyReview({
			previousState: previousSm2State,
			review: { grade, reviewedAt: this.now },
			params: this.params,
		});

		// Create review event
		const reviewEvent: ReviewEventInsert = {
			card_id: card.id,
			owner_user_id: this.ownerUserId,
			grade: REVIEW_GRADE_TO_VALUE[grade],
			time_ms: 0,
			raw_payload: null,
			reviewed_at: this.now.toISOString(),
		};

		// Create scheduling state
		const schedulingState: CardSchedulingStateInsert = {
			owner_user_id: this.ownerUserId,
			card_id: card.id,
			profile_id: this.profileId,
			due_at: dueAt.toISOString(),
			state: nextState,
			last_reviewed_at: this.now.toISOString(),
			last_event_id: null,
		};

		return {
			reviewEvent,
			schedulingState,
			isCardCompleted: grade !== "again", // Completed if not Again
			nextDueAt: dueAt,
		};
	}

	/**
   * Updates session state after a grade is submitted.
   */
	moveToNext(result: ReviewResult, grade: ReviewGrade): void {
		const item = this.items.find(
			(i) => i.card.id === result.reviewEvent.card_id,
		);
		if (!item) return;

		// Track new cards (before updating phase)
		if (item.phase === "new") {
			this.newCardsSeen++;
		}

		// Update card state
		item.schedulingState = {
			id: generateId(),
			card_id: item.card.id,
			owner_user_id: this.ownerUserId,
			profile_id: this.profileId,
			due_at: result.schedulingState.due_at,
			state: result.schedulingState.state,
			last_reviewed_at: result.schedulingState.last_reviewed_at,
			last_event_id: null,
			created_at: nowIso(),
		};
		item.phase = getQueuePhase(result.schedulingState.state as Sm2State);
		item.scheduledAt = result.nextDueAt;

		// Handle "Again" - card stays in queue for immediate re-review
		if (grade === "again") {
			this.againCardIds.add(item.card.id);
			// Don't mark as completed - will be re-shown
		} else {
			// Hard/Good/Easy - card is "session-completed"
			this.againCardIds.delete(item.card.id);
			item.isCompleted = true;
			this.completedIds.add(item.card.id);
		}

		// Re-sort queue (Again cards bubble to top via priority)
		this.items = this.sortQueue(this.items);
	}

	/**
   * Checks if the session is complete.
   * Complete when no cards are available for immediate review.
   */
	isComplete(): boolean {
		return this.getCurrentCard() === null;
	}

	/**
   * Gets statistics for the current session.
   */
	getStats(): SessionStats {
		const stats = {
			totalCards: this.items.length,
			completedCards: this.completedIds.size,
			remainingCards: 0,
			newCards: 0,
			learningCards: 0,
			reviewCards: 0,
			relearningCards: 0,
		};

		for (const item of this.items) {
			if (!item.isCompleted || this.againCardIds.has(item.card.id)) {
				stats.remainingCards++;
			}

			switch (item.phase) {
				case "new":
					stats.newCards++;
					break;
				case "learning":
					stats.learningCards++;
					break;
				case "review":
					stats.reviewCards++;
					break;
				case "relearning":
					stats.relearningCards++;
					break;
			}
		}

		return stats;
	}

	/**
   * Gets a snapshot of the current queue.
   */
	getQueueSnapshot(): QueueItem[] {
		return [...this.items];
	}

	/**
	 * Gets the current card's SM-2 state for previewing grade options.
	 */
	getCurrentCardState(): Sm2State | null {
		const item = this.getCurrentItem();
		if (!item) return null;
		return (item.schedulingState?.state as Sm2State) ?? null;
	}

	/**
	 * Gets the SM-2 parameters used in this session.
	 */
	getParams(): Sm2Parameters {
		return this.params;
	}

	/**
   * Gets cards that were rated "Again" and need re-review.
   */
	getAgainCards(): Card[] {
		return this.items
			.filter((item) => this.againCardIds.has(item.card.id))
			.map((item) => item.card);
	}
}
