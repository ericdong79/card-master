import type { Card } from "@/lib/api/entities/card";
import type {
	CardSchedulingState,
	CardSchedulingStateInsert,
} from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEventInsert } from "@/lib/api/entities/review-event";
import { LOCAL_OWNER_ID } from "@/lib/api/local-user";
import { generateId, nowIso } from "@/lib/api/utils";
import {
	normalizeSm2Parameters,
	sm2Scheduler,
	type Sm2Parameters,
	type Sm2State,
} from "@/lib/scheduling/sm2";
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
 * Checks if a card is due for review in this session.
 * 
 * For new cards: limited by daily quota
 * For learning/relearning: always shown in current session (they need to graduate)
 * For review: shown if due time <= now
 */
function isCardDue(
	item: QueueItem,
	now: Date,
	newCardsSeen: number,
	newCardsLimit: number,
): boolean {
	// Completed cards are not due
	if (item.isCompleted) return false;

	// New cards are limited by daily quota
	if (item.phase === "new") {
		return newCardsSeen < newCardsLimit;
	}

	// Learning and relearning cards are always shown in the current session
	// They need to graduate before the session ends
	if (item.phase === "learning" || item.phase === "relearning") {
		return true;
	}

	// Review cards are due when scheduled time <= now
	return item.scheduledAt.getTime() <= now.getTime();
}

/**
 * Sorts queue items by priority:
 * 1. Not completed before completed
 * 2. Learning/Relearning > Review > New
 * 3. By scheduled time (earlier first)
 */
function sortQueueItems(items: QueueItem[]): QueueItem[] {
	const phasePriority: Record<QueuePhase, number> = {
		learning: 0,
		relearning: 0,
		review: 1,
		new: 2,
	};

	return [...items].sort((a, b) => {
		// 1. Completed cards go to the end
		if (a.isCompleted !== b.isCompleted) {
			return a.isCompleted ? 1 : -1;
		}

		// 2. Compare phase priority
		const priorityDiff = phasePriority[a.phase] - phasePriority[b.phase];
		if (priorityDiff !== 0) return priorityDiff;

		// 3. Sort by scheduled time (earlier first)
		return a.scheduledAt.getTime() - b.scheduledAt.getTime();
	});
}

/**
 * ReviewSession manages the state and logic of a review session.
 * This is a pure TypeScript class with no React dependencies.
 */
export class ReviewSession {
	private items: QueueItem[];
	private completedIds: Set<string>;
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
		this.items = sortQueueItems(items);
		this.completedIds = new Set();
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

			// For new cards, schedule them at the end of the queue initially
			// They will be shown after current due cards
			const scheduledAt = state?.due_at
				? new Date(state.due_at)
				: new Date(now.getTime() + 86400000); // New cards scheduled for "tomorrow" initially

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
   * Gets the next due queue item.
   * Returns null if no cards are due in this session.
   */
	getCurrentItem(): QueueItem | null {
		for (const item of this.items) {
			if (isCardDue(item, this.now, this.newCardsSeen, this.newCardsLimit)) {
				return item;
			}
		}
		return null;
	}

	/**
   * Gets the current card to review.
   */
	getCurrentCard(): Card | null {
		return this.getCurrentItem()?.card ?? null;
	}

	/**
   * Submits a grade for the current card and returns the result.
   * This does not modify the session state - call moveToNext() after.
   */
	submitGrade(grade: ReviewGrade): ReviewResult {
		const item = this.getCurrentItem();
		if (!item) {
			throw new Error("No current card to grade");
		}

		const card = item.card;
		const existingState = item.schedulingState;
		const previousSm2State = (existingState?.state as Sm2State) ?? null;

		// Apply the scheduling algorithm
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
			last_event_id: null, // Will be set after event is persisted
		};

		// Determine if card is "completed" for this session
		const isCardCompleted = this.checkCardCompleted(item.phase, nextState.phase);

		return {
			reviewEvent,
			schedulingState,
			isCardCompleted,
			nextDueAt: dueAt,
		};
	}

	/**
   * Updates the session state after a grade is submitted.
   * Call this after persisting the data.
   */
	moveToNext(result: ReviewResult): void {
		// Find the item for this card
		const item = this.items.find(
			(i) => i.card.id === result.reviewEvent.card_id,
		);
		if (!item) return;

		// Update item state
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

		// Track new cards seen (for quota)
		if (item.phase === "new") {
			this.newCardsSeen++;
		}

		// Mark as completed if graduated or reviewed
		if (result.isCardCompleted) {
			item.isCompleted = true;
			this.completedIds.add(item.card.id);
		}

		// Re-sort queue to handle learning cards that need to reappear
		this.items = sortQueueItems(this.items);
	}

	/**
   * Checks if a card is "completed" for this session.
   * A card is completed when:
   * - It graduates from learning/relearning/new to review
   * - It completes a review phase card
   * 
   * A card is NOT completed when:
   * - It stays in learning/relearning (needs more steps)
   * - Review card lapses to relearning
   */
	private checkCardCompleted(
		previousPhase: QueuePhase,
		nextPhase: Sm2State["phase"],
	): boolean {
		// Card graduated to review (from new, learning, or relearning)
		if (nextPhase === "review") {
			// New cards that graduate on first review
			if (previousPhase === "new") return true;
			// Learning cards that graduate
			if (previousPhase === "learning") return true;
			// Relearning cards that graduate back to review
			if (previousPhase === "relearning") return true;
			// Review cards completing their review
			if (previousPhase === "review") return true;
		}
		
		// Review card lapsing to relearning is NOT complete
		// (it needs to go through relearning steps)
		if (previousPhase === "review" && nextPhase === "relearning") {
			return false;
		}
		
		return false;
	}

	/**
   * Checks if the session is complete.
   * Session is complete when no more cards are due.
   */
	isComplete(): boolean {
		// Check if there are any due cards
		return !this.items.some((item) =>
			isCardDue(item, this.now, this.newCardsSeen, this.newCardsLimit),
		);
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
			if (!item.isCompleted) {
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
   * Gets the position of the current card in the queue.
   */
	getCurrentPosition(): { current: number; total: number } {
		const dueItems = this.items.filter((item) =>
			isCardDue(item, this.now, this.newCardsSeen, this.newCardsLimit),
		);
		return {
			current: this.completedIds.size + 1,
			total: dueItems.length + this.completedIds.size,
		};
	}
}
