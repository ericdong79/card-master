import { useCallback, useEffect, useMemo, useState } from "react";
import { listCards } from "@/lib/api/card";
import { getCardPackById } from "@/lib/api/card-pack";
import { createApiClient } from "@/lib/api/client";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";

import type { ReviewEvent } from "@/lib/api/entities/review-event";
import { LOCAL_OWNER_ID } from "@/lib/api/local-user";
import { createReviewEvent } from "@/lib/api/review-event";
import { getOrCreateSchedulingProfile } from "@/lib/api/scheduling-profile";
import {
	listSchedulingStatesByCardIds,
	upsertSchedulingState,
} from "@/lib/api/scheduling-state";
import { type ReviewResult, ReviewSession } from "@/lib/review";
import { normalizeSm2Parameters } from "@/lib/scheduling/sm2";
import type {
	ReviewGrade,
	Sm2Parameters,
	Sm2State,
} from "@/lib/scheduling/types";

export type ReviewSessionState = {
	cardPack: CardPack | null;
	loading: boolean;
	error: string | null;
	grading: boolean;
	totalReviewed: number;
	isComplete: boolean;
};

export type UseReviewSessionReturn = ReviewSessionState & {
	/** Current card to review, or null if session complete */
	currentCard: Card | null;
	/** All cards in the pack (for lookup) */
	cards: Card[];
	/** Total number of cards in the session */
	totalCards: number;
	/** Number of cards completed (reviewed at least once, not Again) */
	completedCount: number;
	/** Current card's SM-2 state for previewing grade intervals */
	currentCardState: Sm2State | null;
	/** SM-2 parameters used in this session */
	params: Sm2Parameters | null;
	/** Submit a grade for the current card */
	handleGrade: (grade: ReviewGrade) => Promise<void>;
};

/**
 * React hook for managing a review session.
 *
 * This hook wraps the pure TypeScript ReviewSession class and handles:
 * - Data loading from IndexedDB
 * - State persistence after each review
 * - React state management
 *
 * The core review logic is in ReviewSession (client/src/lib/review/review-session.ts)
 * which can be used independently for testing or other frameworks.
 */
export function useReviewSession(
	cardPackId: string | undefined,
): UseReviewSessionReturn {
	const client = useMemo(() => createApiClient(), []);
	const ownerUserId = LOCAL_OWNER_ID;

	// UI state
	const [cardPack, setCardPack] = useState<CardPack | null>(null);
	const [cards, setCards] = useState<Card[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [grading, setGrading] = useState(false);
	const [totalReviewed, setTotalReviewed] = useState(0);
	const [isComplete, setIsComplete] = useState(false);

	// Core review session (pure TypeScript class)
	const [session, setSession] = useState<ReviewSession | null>(null);
	const [currentCard, setCurrentCard] = useState<Card | null>(null);

	// Initialize session
	useEffect(() => {
		if (!cardPackId) {
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);
		setSession(null);
		setIsComplete(false);
		setTotalReviewed(0);
		setCurrentCard(null);

		(async () => {
			try {
				// Load data
				const [pack, fetchedCards, profile] = await Promise.all([
					getCardPackById(client, cardPackId, ownerUserId),
					listCards(client, ownerUserId, { cardPackId }),
					getOrCreateSchedulingProfile(client, ownerUserId),
				]);

				if (!pack) {
					setError("Card pack not found or inaccessible.");
					return;
				}

				setCardPack(pack);
				setCards(fetchedCards);

				// Load scheduling states for cards
				const stateList = fetchedCards.length
					? await listSchedulingStatesByCardIds(
							client,
							ownerUserId,
							fetchedCards.map((c) => c.id),
						)
					: [];

				// Create review session
				const params = normalizeSm2Parameters(
					profile.parameters as Sm2Parameters,
				);

				const newSession = ReviewSession.create(
					fetchedCards,
					stateList,
					params,
					profile.id,
					{ newCardsLimit: 20 },
				);

				setSession(newSession);
				setCurrentCard(newSession.getCurrentCard());
				setIsComplete(newSession.isComplete());
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load review data",
				);
			} finally {
				setLoading(false);
			}
		})();
	}, [cardPackId, client, ownerUserId]);

	// Handle grade submission
	const handleGrade = useCallback(
		async (grade: ReviewGrade) => {
			if (!session || grading) return;

			setGrading(true);

			try {
				// 1. Calculate review result (pure logic, no side effects)
				const result = session.submitGrade(grade);

				// 2. Persist review event
				const event: ReviewEvent = await createReviewEvent(client, {
					card_id: result.reviewEvent.card_id,
					owner_user_id: result.reviewEvent.owner_user_id,
					grade: result.reviewEvent.grade,
					time_ms: result.reviewEvent.time_ms,
					raw_payload: result.reviewEvent.raw_payload,
					reviewed_at: result.reviewEvent.reviewed_at,
				});

				// 3. Persist scheduling state
				const existingState = session
					.getQueueSnapshot()
					.find(
						(item) => item.card.id === result.reviewEvent.card_id,
					)?.schedulingState;

				await upsertSchedulingState(client, existingState ?? null, {
					...result.schedulingState,
					last_event_id: event.id,
				});

				// 4. Update session state
				const updatedResult: ReviewResult = {
					...result,
					schedulingState: {
						...result.schedulingState,
						last_event_id: event.id,
					},
				};

				session.moveToNext(updatedResult, grade);

				// 5. Update React state
				setTotalReviewed((count) => count + 1);
				setCurrentCard(session.getCurrentCard());
				setIsComplete(session.isComplete());
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to record review",
				);
			} finally {
				setGrading(false);
			}
		},
		[session, client, grading],
	);

	// Get stats from session
	const totalCards = session?.getStats().totalCards ?? 0;
	const completedCount = session?.getStats().completedCards ?? 0;
	const currentCardState = session?.getCurrentCardState() ?? null;
	const params = session?.getParams() ?? null;

	return {
		cardPack,
		loading,
		error,
		grading,
		totalReviewed,
		isComplete,
		currentCard,
		cards,
		totalCards,
		completedCount,
		currentCardState,
		params,
		handleGrade,
	};
}
