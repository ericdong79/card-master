import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	countTodayCompletedCards,
	normalizeDailyReviewSettings,
} from "@/features/review/daily-goal";
import { persistReviewResult } from "@/features/review/hooks/persist-review-result";
import { listCards } from "@/lib/api/card";
import { getCardPackById } from "@/lib/api/card-pack";
import { createApiClient } from "@/lib/api/client";
import type { Card } from "@/lib/api/entities/card";
import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardPack } from "@/lib/api/entities/card-pack";
import { getOrCreateSchedulingProfile } from "@/lib/api/scheduling-profile";
import {
	listSchedulingStatesByCardIds,
} from "@/lib/api/scheduling-state";
import { ReviewSession } from "@/lib/review";
import { normalizeSm2Parameters } from "@/lib/scheduling/sm2";
import type {
	ReviewGrade,
	Sm2Parameters,
	Sm2State,
} from "@/lib/scheduling/types";
import { useAuth } from "@/features/auth/use-auth";
import { useProfile } from "@/features/profile/profile-context";

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
	lastMasteryFeedback: {
		cardId: string;
		transition: {
			beforeScore: number;
			afterScore: number;
			beforeState: MasteryState;
			afterState: MasteryState;
			delta: number;
		};
		rating: ReviewGrade;
		isFirstLearn: boolean;
	} | null;
	/** Submit a grade for the current card */
	handleGrade: (grade: ReviewGrade) => Promise<void>;
	/** Move the current card later without recording a review */
	handleSkip: () => void;
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
	const [grading, setGrading] = useState(false);
	const [totalReviewed, setTotalReviewed] = useState(0);
	const [isComplete, setIsComplete] = useState(false);
	const [lastMasteryFeedback, setLastMasteryFeedback] = useState<{
		cardId: string;
		transition: {
			beforeScore: number;
			afterScore: number;
			beforeState: MasteryState;
			afterState: MasteryState;
			delta: number;
		};
		rating: ReviewGrade;
		isFirstLearn: boolean;
	} | null>(null);

	// Core review session (pure TypeScript class)
	const [session, setSession] = useState<ReviewSession | null>(null);
	const [currentCard, setCurrentCard] = useState<Card | null>(null);

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
		setTotalReviewed(0);
		setCurrentCard(null);
		setLastMasteryFeedback(null);

		(async () => {
			try {
				// Load data
				const [pack, fetchedCards, schedulingProfile, completedToday] = await Promise.all([
					getCardPackById(client, accountUserId, profileId, cardPackId),
					listCards(client, accountUserId, profileId, { cardPackId }),
					getOrCreateSchedulingProfile(client, accountUserId, profileId),
					countTodayCompletedCards(client, accountUserId, profileId),
				]);

				if (!pack) {
					setError(t("errors.packNotFound"));
					return;
				}

				setCardPack(pack);
				setCards(fetchedCards);

				// Load scheduling states for cards
				const stateList = fetchedCards.length
					? await listSchedulingStatesByCardIds(
							client,
							accountUserId,
							profileId,
							fetchedCards.map((c) => c.id),
						)
					: [];

				// Create review session
				const params = normalizeSm2Parameters(
					schedulingProfile.parameters as Sm2Parameters,
				);
				const settings = normalizeDailyReviewSettings({
					dailyGoal: currentProfile?.daily_goal,
					reviewPerDay: currentProfile?.review_per_day,
					newPerDay: currentProfile?.new_per_day,
				});
				const sessionTotalLimit =
					completedToday < settings.dailyGoal
						? Math.max(0, settings.dailyGoal - completedToday)
						: settings.reviewPerDay + settings.newPerDay;
				const reviewCardsLimit = settings.reviewPerDay;
				const newCardsLimit = settings.newPerDay;

				const newSession = ReviewSession.create(
					fetchedCards,
					stateList,
					params,
					schedulingProfile.id,
					{
						newCardsLimit,
						reviewCardsLimit,
						totalCardsLimit: sessionTotalLimit,
						ownerUserId: profileId,
						accountUserId,
						learnerProfileId: profileId,
					},
				);

				setSession(newSession);
				setCurrentCard(newSession.getCurrentCard());
				setIsComplete(newSession.isComplete());
			} catch (err) {
				setError(
					err instanceof Error ? err.message : t("errors.loadReviewData"),
				);
			} finally {
				setLoading(false);
			}
		})();
	}, [
		accountUserId,
		cardPackId,
		client,
		currentProfile?.daily_goal,
		currentProfile?.new_per_day,
		currentProfile?.review_per_day,
		profileId,
		t,
	]);

	// Handle grade submission
	const handleGrade = useCallback(
		async (grade: ReviewGrade) => {
			if (!session || grading || !accountUserId || !profileId) return;

			setGrading(true);

			try {
				// 1. Calculate review result (pure logic, no side effects)
				const result = session.submitGrade(grade);
				const existingState = session
					.getQueueSnapshot()
					.find(
						(item) => item.card.id === result.reviewEvent.card_id,
					)?.schedulingState;

				session.moveToNext(result, grade);

				setTotalReviewed((count) => count + 1);
				setCurrentCard(session.getCurrentCard());
				setIsComplete(session.isComplete());
				setError(null);
				setGrading(false);

				void persistReviewResult({
					client,
					accountUserId,
					profileId,
					grade,
					result,
					existingState: existingState ?? null,
					onMasteryFeedback: setLastMasteryFeedback,
				}).catch((err) => {
					console.error("Failed to persist review result", err);
					setError(
						err instanceof Error ? err.message : t("errors.recordReview"),
					);
				});
			} catch (err) {
				setError(
					err instanceof Error ? err.message : t("errors.recordReview"),
				);
				setGrading(false);
			}
		},
		[accountUserId, session, client, grading, profileId, t],
	);

	const handleSkip = useCallback(() => {
		if (!session || grading) return;

		session.skipCurrent();
		setCurrentCard(session.getCurrentCard());
		setIsComplete(session.isComplete());
		setError(null);
	}, [session, grading]);

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
		lastMasteryFeedback,
		handleGrade,
		handleSkip,
	};
}
