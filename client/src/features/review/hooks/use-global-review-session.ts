import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { computeMasteryUpdate } from "@/features/mastery";
import {
	countTodayCompletedCards,
	notifyDailyReviewProgressUpdated,
	normalizeDailyReviewSettings,
} from "@/features/review/daily-goal";
import { listCards } from "@/lib/api/card";
import {
	getMasteryStateByCardId,
	upsertMasteryState,
} from "@/lib/api/card-mastery-state";
import { createApiClient } from "@/lib/api/client";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import { listCardPacks } from "@/lib/api/card-pack";
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
	const { currentProfile } = useProfile();
	const ownerUserId = currentProfile?.id ?? null;

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
		if (!ownerUserId) {
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
				const [fetchedPacks, fetchedCards, profile, completedToday] =
					await Promise.all([
						listCardPacks(client, ownerUserId),
						listCards(client, ownerUserId),
						getOrCreateSchedulingProfile(client, ownerUserId),
						countTodayCompletedCards(client, ownerUserId),
					]);

				setCardPacks(fetchedPacks);
				setCards(fetchedCards);

				const stateList =
					fetchedCards.length > 0
						? await listSchedulingStatesByCardIds(
								client,
								ownerUserId,
								fetchedCards.map((card) => card.id),
							)
						: [];

				const params = normalizeSm2Parameters(
					profile.parameters as Sm2Parameters,
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
					profile.id,
					{
						newCardsLimit: settings.newPerDay,
						reviewCardsLimit: settings.reviewPerDay,
						totalCardsLimit: sessionTotalLimit,
						ownerUserId,
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
		client,
		currentProfile?.daily_goal,
		currentProfile?.new_per_day,
		currentProfile?.review_per_day,
		ownerUserId,
		t,
	]);

	const handleGrade = useCallback(
		async (grade: ReviewGrade) => {
			if (!session || grading || !ownerUserId) return;

			setGrading(true);
			try {
				const result = session.submitGrade(grade);
				const event: ReviewEvent = await createReviewEvent(client, {
					card_id: result.reviewEvent.card_id,
					owner_user_id: result.reviewEvent.owner_user_id,
					grade: result.reviewEvent.grade,
					time_ms: result.reviewEvent.time_ms,
					raw_payload: result.reviewEvent.raw_payload,
					reviewed_at: result.reviewEvent.reviewed_at,
				});

				const existingState = session
					.getQueueSnapshot()
					.find((item) => item.card.id === result.reviewEvent.card_id)
					?.schedulingState;

				await upsertSchedulingState(client, existingState ?? null, {
					...result.schedulingState,
					last_event_id: event.id,
				});

				const existingMastery = await getMasteryStateByCardId(
					client,
					ownerUserId,
					result.reviewEvent.card_id,
				);
				const masteryUpdate = computeMasteryUpdate({
					existing: existingMastery,
					ownerUserId,
					cardId: result.reviewEvent.card_id,
					grade,
					now: new Date(result.reviewEvent.reviewed_at),
					previousDueAt: existingState ? new Date(existingState.due_at) : null,
					nextDueAt: result.nextDueAt,
					previousSm2State: (existingState?.state as Sm2State | null) ?? null,
					nextSm2State: result.schedulingState.state as Sm2State,
				});

				await upsertMasteryState(client, existingMastery, masteryUpdate.nextMastery);
				setLastMasteryFeedback({
					cardId: result.reviewEvent.card_id,
					transition: masteryUpdate.transition,
					rating: grade,
					isFirstLearn: masteryUpdate.isFirstLearn,
				});

				const updatedResult: ReviewResult = {
					...result,
					schedulingState: {
						...result.schedulingState,
						last_event_id: event.id,
					},
				};
				session.moveToNext(updatedResult, grade);
				if (grade !== "again") {
					notifyDailyReviewProgressUpdated();
				}

				setTotalReviewed((count) => count + 1);
				setCurrentCard(session.getCurrentCard());
				setIsComplete(session.isComplete());
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : t("errors.recordReview"),
				);
			} finally {
				setGrading(false);
			}
		},
		[session, grading, ownerUserId, client, t],
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
