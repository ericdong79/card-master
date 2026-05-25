import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	countTodayCompletedCards,
	normalizeDailyReviewSettings,
} from "@/features/review/daily-goal";
import { persistReviewResult } from "@/features/review/hooks/persist-review-result";
import { listCards } from "@/lib/api/card";
import { createApiClient } from "@/lib/api/client";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import { listCardPacks } from "@/lib/api/card-pack";
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
	const client = useMemo(() => createApiClient(), []);
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

	const cardPackById = useMemo(
		() =>
			cardPacks.reduce<Record<string, CardPack>>((acc, pack) => {
				acc[pack.id] = pack;
				return acc;
			}, {}),
		[cardPacks],
	);

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
				const [fetchedPacks, fetchedCards, schedulingProfile, completedToday] =
					await Promise.all([
						listCardPacks(client, accountUserId, profileId),
						listCards(client, accountUserId, profileId),
						getOrCreateSchedulingProfile(client, accountUserId, profileId),
						countTodayCompletedCards(client, accountUserId, profileId),
					]);

				setCardPacks(fetchedPacks);
				setCards(fetchedCards);

				const stateList =
					fetchedCards.length > 0
						? await listSchedulingStatesByCardIds(
								client,
								accountUserId,
								profileId,
								fetchedCards.map((card) => card.id),
							)
						: [];

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

				const newSession = ReviewSession.create(
					fetchedCards,
					stateList,
					params,
					schedulingProfile.id,
					{
						newCardsLimit: settings.newPerDay,
						reviewCardsLimit: settings.reviewPerDay,
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
		client,
		currentProfile?.daily_goal,
		currentProfile?.new_per_day,
		currentProfile?.review_per_day,
		profileId,
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
		[accountUserId, session, grading, profileId, client, t],
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
