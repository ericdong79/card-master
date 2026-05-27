import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { persistReviewResult } from "@/features/review/hooks/persist-review-result";
import { buildSm2ReviewSession } from "@/features/review/hooks/review-session-loader";
import {
	type MasteryFeedback,
	type ReviewSessionMachineState,
	initialReviewSessionState,
	isLoadedPhase,
	reviewSessionReducer,
} from "@/features/review/hooks/use-review-session-state";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import { createCardRepository } from "@/lib/data/repositories/card-repository";
import { createCardPackRepository } from "@/lib/data/repositories/card-pack-repository";
import { createReviewRepository } from "@/lib/data/repositories/review-repository";
import { createSchedulingRepository } from "@/lib/data/repositories/scheduling-repository";
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
	lastMasteryFeedback: MasteryFeedback | null;
	/** Submit a grade for the current card */
	handleGrade: (grade: ReviewGrade) => Promise<void>;
	/** Move the current card later without recording a review */
	handleSkip: () => void;
};

/**
 * Project the internal state-machine state onto the legacy boolean-style
 * public API. Consumers depend on flat fields like `loading`, `error`,
 * `isComplete` — they predate the discriminated union, so the hook keeps
 * exposing them unchanged.
 */
function projectPublicSurface(
	state: ReviewSessionMachineState,
): Pick<
	UseReviewSessionReturn,
	| "cardPack"
	| "loading"
	| "error"
	| "grading"
	| "isComplete"
	| "currentCard"
	| "cards"
> {
	switch (state.phase) {
		case "idle":
			return {
				cardPack: null,
				loading: false,
				error: null,
				grading: false,
				isComplete: false,
				currentCard: null,
				cards: [],
			};
		case "loading":
			return {
				cardPack: null,
				loading: true,
				error: null,
				grading: false,
				isComplete: false,
				currentCard: null,
				cards: [],
			};
		case "error":
			return {
				cardPack: null,
				loading: false,
				error: state.error,
				grading: false,
				isComplete: false,
				currentCard: null,
				cards: [],
			};
		case "ready":
			return {
				cardPack: state.cardPack,
				loading: false,
				error: null,
				grading: false,
				isComplete: false,
				currentCard: state.currentCard,
				cards: state.cards,
			};
		case "grading":
			return {
				cardPack: state.cardPack,
				loading: false,
				error: null,
				grading: true,
				isComplete: false,
				currentCard: state.currentCard,
				cards: state.cards,
			};
		case "complete":
			return {
				cardPack: state.cardPack,
				loading: false,
				error: null,
				grading: false,
				isComplete: true,
				currentCard: state.currentCard,
				cards: state.cards,
			};
	}
}

/**
 * React hook for managing a review session.
 *
 * This hook wraps the pure TypeScript ReviewSession class and handles:
 * - Data loading from IndexedDB
 * - State persistence after each review
 * - React state management via a discriminated-union state machine
 *
 * The core review logic is in ReviewSession (client/src/lib/review/review-session.ts)
 * which can be used independently for testing or other frameworks.
 *
 * Internal state is a discriminated union (see `use-review-session-state.ts`)
 * so impossible combinations like `loading && error` are unrepresentable.
 */
export function useReviewSession(
	cardPackId: string | undefined,
): UseReviewSessionReturn {
	const { t } = useTranslation();
	const cardRepository = useMemo(() => createCardRepository(), []);
	const cardPackRepository = useMemo(() => createCardPackRepository(), []);
	const reviewRepository = useMemo(() => createReviewRepository(), []);
	const schedulingRepository = useMemo(() => createSchedulingRepository(), []);
	const { accountUserId } = useAuth();
	const { currentProfile } = useProfile();
	const profileId = currentProfile?.id ?? null;

	const [state, dispatch] = useReducer(
		reviewSessionReducer,
		initialReviewSessionState,
	);

	// Initialize session
	useEffect(() => {
		if (!cardPackId || !accountUserId || !profileId) {
			dispatch({ type: "reset" });
			return;
		}

		dispatch({ type: "load" });
		let cancelled = false;

		(async () => {
			try {
				// Load data
				const [packs, fetchedCards, schedulingProfile, completedToday] =
					await Promise.all([
						cardPackRepository.listCardPacks({ accountUserId, profileId }),
						cardRepository.loadPackCards({
							accountUserId,
							profileId,
							cardPackId,
						}),
						schedulingRepository.getOrCreateSchedulingProfile({
							accountUserId,
							profileId,
						}),
						reviewRepository.countTodayCompletedCards({
							accountUserId,
							profileId,
						}),
					]);
				if (cancelled) return;
				const pack = packs.find((item) => item.id === cardPackId) ?? null;

				if (!pack) {
					dispatch({
						type: "loadFailure",
						error: t("errors.packNotFound"),
					});
					return;
				}

				// Load scheduling states for cards
				const stateList = fetchedCards.length
					? await schedulingRepository.listSchedulingStatesByCardIds({
							accountUserId,
							profileId,
							cardIds: fetchedCards.map((c) => c.id),
						})
					: [];
				if (cancelled) return;

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

				dispatch({
					type: "loadSuccess",
					cardPack: pack,
					cards: fetchedCards,
					session: newSession,
				});
			} catch (err) {
				if (cancelled) return;
				dispatch({
					type: "loadFailure",
					error:
						err instanceof Error ? err.message : t("errors.loadReviewData"),
				});
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		accountUserId,
		cardPackRepository,
		cardPackId,
		cardRepository,
		currentProfile?.daily_goal,
		currentProfile?.new_per_day,
		currentProfile?.review_per_day,
		profileId,
		reviewRepository,
		schedulingRepository,
		t,
	]);

	// Handle grade submission
	const handleGrade = useCallback(
		async (grade: ReviewGrade) => {
			if (state.phase !== "ready" || !accountUserId || !profileId) return;

			const { session } = state;
			dispatch({ type: "gradeStart" });

			try {
				// 1. Calculate review result (pure logic, no side effects)
				const result = session.submitGrade(grade);
				const existingState = session
					.getQueueSnapshot()
					.find((item) => item.card.id === result.reviewEvent.card_id)
					?.schedulingState;

				session.moveToNext(result, grade);
				dispatch({ type: "gradeSuccess" });

				void persistReviewResult({
					accountUserId,
					profileId,
					grade,
					result,
					existingState: existingState ?? null,
					onMasteryFeedback: (feedback) =>
						dispatch({ type: "setMasteryFeedback", feedback }),
				}).catch((err) => {
					console.error("Failed to persist review result", err);
					dispatch({
						type: "gradeFailure",
						error:
							err instanceof Error ? err.message : t("errors.recordReview"),
					});
				});
			} catch (err) {
				dispatch({
					type: "gradeFailure",
					error: err instanceof Error ? err.message : t("errors.recordReview"),
				});
			}
		},
		[accountUserId, profileId, state, t],
	);

	const handleSkip = useCallback(() => {
		if (state.phase !== "ready") return;
		state.session.skipCurrent();
		dispatch({ type: "skip" });
	}, [state]);

	// Derived stats from the live session (only when loaded)
	const session = isLoadedPhase(state) ? state.session : null;
	const totalCards = session?.getStats().totalCards ?? 0;
	const completedCount = session?.getStats().completedCards ?? 0;
	const currentCardState = session?.getCurrentCardState() ?? null;
	const params = session?.getParams() ?? null;

	const surface = projectPublicSurface(state);

	return {
		...surface,
		totalReviewed: state.totalReviewed,
		totalCards,
		completedCount,
		currentCardState,
		params,
		lastMasteryFeedback: state.lastMasteryFeedback,
		handleGrade,
		handleSkip,
	};
}
