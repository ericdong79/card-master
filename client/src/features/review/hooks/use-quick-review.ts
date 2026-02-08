import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createApiClient } from "@/lib/api/client";
import { listCards } from "@/lib/api/card";
import { getCardPackById } from "@/lib/api/card-pack";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import { createReviewEvent } from "@/lib/api/review-event";
import {
	QuickReviewSession,
	type SimpleReviewResult,
} from "@/lib/review/quick-review-session";
import { useProfile } from "@/features/profile/profile-context";

export type QuickReviewState = {
	cardPack: CardPack | null;
	loading: boolean;
	error: string | null;
	reviewing: boolean;
	isComplete: boolean;
};

export type UseQuickReviewReturn = QuickReviewState & {
	/** Current card to review, or null if session complete */
	currentCard: Card | null;
	/** Total cards in the pack */
	totalCards: number;
	/** Number of cards marked as "remembered" at least once (learned) */
	learnedCount: number;
	/** Number of cards remaining */
	remainingCount: number;
	/** Current position in the queue */
	position: { current: number; total: number };
	/** Submit a review result */
	handleReview: (result: SimpleReviewResult) => Promise<void>;
	/** Skip current card */
	skipCurrent: () => void;
	/** Cards that were rated "Forgot" */
	forgotCards: Card[];
};

/**
 * React hook for quick review mode
 * 
 * Quick review features:
 * - Simple two-button interface: Forgot / Remembered
 * - Does NOT affect card scheduling (SM-2 state unchanged)
 * - Does NOT calculate due dates
 * - Cards rated "Forgot" are re-shown immediately
 * - Optional: Records review events for statistics
 */
export function useQuickReview(cardPackId: string | undefined): UseQuickReviewReturn {
	const { t } = useTranslation();
	const client = useMemo(() => createApiClient(), []);
	const { currentProfile } = useProfile();
	const ownerUserId = currentProfile?.id ?? null;

	// UI state
	const [cardPack, setCardPack] = useState<CardPack | null>(null);
	const [cards, setCards] = useState<Card[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [reviewing, setReviewing] = useState(false);
	const [isComplete, setIsComplete] = useState(false);

	// Core review session
	const [session, setSession] = useState<QuickReviewSession | null>(null);
	const [currentCard, setCurrentCard] = useState<Card | null>(null);
	const [forgotCards, setForgotCards] = useState<Card[]>([]);
	const [learnedCount, setLearnedCount] = useState(0);

	// Initialize session
	useEffect(() => {
		if (!cardPackId || !ownerUserId) {
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);
		setSession(null);
		setIsComplete(false);
		setCurrentCard(null);
		setForgotCards([]);

		(async () => {
			try {
				// Load card pack and cards
				const [pack, fetchedCards] = await Promise.all([
					getCardPackById(client, cardPackId, ownerUserId),
					listCards(client, ownerUserId, { cardPackId }),
				]);

				if (!pack) {
					setError(t("errors.packNotFound"));
					return;
				}

				if (fetchedCards.length === 0) {
					setError(t("errors.noCardsToReview"));
					return;
				}

				setCardPack(pack);
				setCards(fetchedCards);

				// Create quick review session
				const newSession = QuickReviewSession.create(
					fetchedCards,
					cardPackId,
					{ recordEvents: true, ownerUserId }, // Record events for statistics
				);

				setSession(newSession);
				setCurrentCard(newSession.getCurrentCard());
				setIsComplete(newSession.isComplete());
				setLearnedCount(0);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : t("errors.loadCards"),
				);
			} finally {
				setLoading(false);
			}
		})();
	}, [cardPackId, client, ownerUserId, t]);

	// Handle review submission
	const handleReview = useCallback(
		async (result: SimpleReviewResult) => {
			if (!session || reviewing) return;

			setReviewing(true);

			try {
				// 1. Submit review (no side effects on scheduling)
				const reviewResult = session.submitReview(result);

				// 2. Optionally record event for statistics
				if (reviewResult.reviewEvent) {
					await createReviewEvent(client, {
						card_id: reviewResult.reviewEvent.card_id,
						owner_user_id: reviewResult.reviewEvent.owner_user_id,
						grade: reviewResult.reviewEvent.grade,
						time_ms: reviewResult.reviewEvent.time_ms,
						raw_payload: reviewResult.reviewEvent.raw_payload,
						reviewed_at: reviewResult.reviewEvent.reviewed_at,
					});
				}

				// 3. Update session state
				session.moveToNext(reviewResult);

				// 4. Update React state
				setCurrentCard(session.getCurrentCard());
				setIsComplete(session.isComplete());
				setForgotCards(session.getForgotCards());
				setLearnedCount(session.getStats().learnedCount);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : t("errors.recordReview"));
			} finally {
				setReviewing(false);
			}
		},
		[session, client, reviewing, t],
	);

	// Skip current card
	const skipCurrent = useCallback(() => {
		if (!session) return;
		session.skipCurrent();
		setCurrentCard(session.getCurrentCard());
		setIsComplete(session.isComplete());
	}, [session]);

	// Calculate position
	const position = useMemo(() => {
		return session?.getPosition() ?? { current: 0, total: 0 };
	}, [session]);

	const remainingCount = useMemo(() => {
		return session?.getRemainingCount() ?? 0;
	}, [session]);

	return {
		cardPack,
		loading,
		error,
		reviewing,
		isComplete,
		currentCard,
		totalCards: cards.length,
		learnedCount,
		remainingCount,
		position,
		handleReview,
		skipCurrent,
		forgotCards,
	};
}
