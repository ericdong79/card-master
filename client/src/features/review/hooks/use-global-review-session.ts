import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { persistReviewResult } from "@/features/review/hooks/persist-review-result";
import {
	buildSm2ReviewSession,
	mapCardPacksById,
} from "@/features/review/hooks/review-session-loader";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import { createCardRepository } from "@/lib/data/repositories/card-repository";
import { createCardPackRepository } from "@/lib/data/repositories/card-pack-repository";
import { createReviewRepository } from "@/lib/data/repositories/review-repository";
import { createSchedulingRepository } from "@/lib/data/repositories/scheduling-repository";
import type { ReviewSession } from "@/lib/review";
import type {
	ReviewGrade,
	Sm2Parameters,
	Sm2State,
} from "@/lib/scheduling/types";
import { useAuth } from "@/features/auth/use-auth";
import { useProfile } from "@/features/profile/profile-context";

export type GlobalReviewSessionState = {
	cardPacks: CardPack[];
	cardPackById: Record<string, CardPack>;
	loading: boolean;
	error: string | null;
	grading: boolean;
	totalReviewed: number;
	isComplete: boolean;
};

export type UseGlobalReviewSessionReturn = GlobalReviewSessionState & {
	currentCard: Card | null;
	cards: Card[];
	sessionPackCount: number;
	totalCards: number;
	completedCount: number;
	currentCardState: Sm2State | null;
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
	handleGrade: (grade: ReviewGrade) => Promise<void>;
	handleSkip: () => void;
};

export function useGlobalReviewSession(): UseGlobalReviewSessionReturn {
	const { t } = useTranslation();
	const cardRepository = useMemo(() => createCardRepository(), []);
	const cardPackRepository = useMemo(() => createCardPackRepository(), []);
	const reviewRepository = useMemo(() => createReviewRepository(), []);
	const schedulingRepository = useMemo(() => createSchedulingRepository(), []);
	const { accountUserId } = useAuth();
	const { currentProfile } = useProfile();
	const profileId = currentProfile?.id ?? null;

	const [cardPacks, setCardPacks] = useState<CardPack[]>([]);
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

	const [session, setSession] = useState<ReviewSession | null>(null);
	const [currentCard, setCurrentCard] = useState<Card | null>(null);

	const cardPackById = useMemo(() => mapCardPacksById(cardPacks), [cardPacks]);

	useEffect(() => {
		if (!accountUserId || !profileId) {
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
				const [fetchedPacks, schedulingProfile, completedToday] =
					await Promise.all([
						cardPackRepository.listCardPacks({ accountUserId, profileId }),
						schedulingRepository.getOrCreateSchedulingProfile({
							accountUserId,
							profileId,
						}),
						reviewRepository.countTodayCompletedCards({
							accountUserId,
							profileId,
						}),
					]);
				const activePackIds = new Set(
					fetchedPacks
						.filter((pack) => pack.status === "active")
						.map((pack) => pack.id),
				);
				const fetchedCards = (
					await cardRepository.loadProfileCards({ accountUserId, profileId })
				).filter((card) => activePackIds.has(card.card_pack_id));

				setCardPacks(fetchedPacks);
				setCards(fetchedCards);

				const stateList =
					fetchedCards.length > 0
						? await schedulingRepository.listSchedulingStatesByCardIds({
								accountUserId,
								profileId,
								cardIds: fetchedCards.map((card) => card.id),
							})
						: [];

				const { session: newSession } = buildSm2ReviewSession({
					accountUserId,
					profileId,
					cards: fetchedCards,
					schedulingStates: stateList,
					schedulingProfile,
					completedToday,
					settings: {
						dailyGoal: currentProfile?.daily_goal,
						reviewPerDay: currentProfile?.review_per_day,
						newPerDay: currentProfile?.new_per_day,
					},
				});

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
		cardPackRepository,
		cardRepository,
		currentProfile?.daily_goal,
		currentProfile?.new_per_day,
		currentProfile?.review_per_day,
		profileId,
		reviewRepository,
		schedulingRepository,
		t,
	]);

	const handleGrade = useCallback(
		async (grade: ReviewGrade) => {
			if (!session || grading || !accountUserId || !profileId) return;

			setGrading(true);
			try {
				const result = session.submitGrade(grade);
				const existingState = session
					.getQueueSnapshot()
					.find((item) => item.card.id === result.reviewEvent.card_id)
					?.schedulingState;

				session.moveToNext(result, grade);

				setTotalReviewed((count) => count + 1);
				setCurrentCard(session.getCurrentCard());
				setIsComplete(session.isComplete());
				setError(null);
				setGrading(false);

				void persistReviewResult({
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
		[accountUserId, session, grading, profileId, t],
	);

	const handleSkip = useCallback(() => {
		if (!session || grading) return;

		session.skipCurrent();
		setCurrentCard(session.getCurrentCard());
		setIsComplete(session.isComplete());
		setError(null);
	}, [session, grading]);

	const totalCards = session?.getStats().totalCards ?? 0;
	const completedCount = session?.getStats().completedCards ?? 0;
	const currentCardState = session?.getCurrentCardState() ?? null;
	const params = session?.getParams() ?? null;
	const sessionPackCount = session
		? new Set(session.getQueueSnapshot().map((item) => item.card.card_pack_id)).size
		: 0;

	return {
		cardPacks,
		cardPackById,
		loading,
		error,
		grading,
		totalReviewed,
		isComplete,
		currentCard,
		cards,
		sessionPackCount,
		totalCards,
		completedCount,
		currentCardState,
		params,
		lastMasteryFeedback,
		handleGrade,
		handleSkip,
	};
}
