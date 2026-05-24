import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { notifyDailyReviewProgressUpdated } from "@/features/review/daily-goal";
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
import { useAuth } from "@/features/auth/use-auth";
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
	const { accountUserId } = useAuth();
	const { currentProfile } = useProfile();
	const profileId = currentProfile?.id ?? null;

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
		if (!cardPackId || !accountUserId || !profileId) {
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
					getCardPackById(client, accountUserId, profileId, cardPackId),
					listCards(client, accountUserId, profileId, { cardPackId }),
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
					{
						recordEvents: true,
						ownerUserId: profileId,
						accountUserId,
						profileId,
					}, // Record events for statistics
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
	}, [accountUserId, cardPackId, client, profileId, t]);

	// Handle review submission
	const handleReview = useCallback(
		async (result: SimpleReviewResult) => {
			if (!session || reviewing || !accountUserId || !profileId) return;

			setReviewing(true);

			try {
				// 1. Submit review (no side effects on scheduling)
				const reviewResult = session.submitReview(result);

				// 2. Optionally record event for statistics
				if (reviewResult.reviewEvent) {
					await createReviewEvent(client, reviewResult.reviewEvent);
					if (reviewResult.reviewEvent.grade > 1) {
						notifyDailyReviewProgressUpdated();
					}
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
		[accountUserId, session, client, reviewing, profileId, t],
	);

	// Skip current card
	const skipCurrent = useCallback(() => {
		if (!session || reviewing) return;
		session.skipCurrent();
		setCurrentCard(session.getCurrentCard());
		setIsComplete(session.isComplete());
		setForgotCards(session.getForgotCards());
		setLearnedCount(session.getStats().learnedCount);
	}, [session, reviewing]);

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
