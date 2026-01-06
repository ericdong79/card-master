import { useEffect, useMemo, useState } from "react";
import { buildQueue } from "@/features/review/lib/queue";
import { createApiClient } from "@/lib/api/client";
import { listCards } from "@/lib/api/card";
import { getCardPackById } from "@/lib/api/card-pack";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import { LOCAL_OWNER_ID } from "@/lib/api/local-user";
import { createReviewEvent } from "@/lib/api/review-event";
import { getOrCreateSchedulingProfile } from "@/lib/api/scheduling-profile";
import {
	listSchedulingStatesByCardIds,
	upsertSchedulingState,
} from "@/lib/api/scheduling-state";
import {
	normalizeSm2Parameters,
	type Sm2Parameters,
	type Sm2State,
	sm2Scheduler,
} from "@/lib/scheduling/sm2";
import type { ReviewGrade } from "@/lib/scheduling/types";

const REVIEW_GRADE_TO_VALUE: Record<ReviewGrade, number> = {
	again: 1,
	hard: 2,
	good: 3,
	easy: 4,
};

export type ReviewSessionState = {
	cardPack: CardPack | null;
	queue: Card[];
	states: Map<string, CardSchedulingState>;
	loading: boolean;
	error: string | null;
	grading: boolean;
	totalReviewed: number;
	profileId: string | null;
};

export type UseReviewSessionReturn = ReviewSessionState & {
	handleGrade: (grade: ReviewGrade) => Promise<void>;
};

export function useReviewSession(
	cardPackId: string | undefined,
): UseReviewSessionReturn {
	const client = useMemo(() => createApiClient(), []);
	const ownerUserId = LOCAL_OWNER_ID;

	const [cardPack, setCardPack] = useState<CardPack | null>(null);
	const [cards, setCards] = useState<Card[]>([]);
	const [states, setStates] = useState<Map<string, CardSchedulingState>>(
		new Map(),
	);
	const [queue, setQueue] = useState<Card[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [grading, setGrading] = useState(false);
	const [totalReviewed, setTotalReviewed] = useState(0);
	const [profileParams, setProfileParams] = useState<Sm2Parameters | null>(
		null,
	);
	const [profileId, setProfileId] = useState<string | null>(null);

	useEffect(() => {
		if (!cardPackId) return;
		setLoading(true);
		setError(null);

		(async () => {
			try {
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
				setProfileParams(
					normalizeSm2Parameters(profile.parameters as Sm2Parameters),
				);
				setProfileId(profile.id);

				const stateList = fetchedCards.length
					? await listSchedulingStatesByCardIds(
							client,
							ownerUserId,
							fetchedCards.map((c) => c.id),
					  )
					: [];

				const stateMap = new Map(stateList.map((s) => [s.card_id, s]));
				setStates(stateMap);
				setQueue(buildQueue(fetchedCards, stateList));
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load review data",
				);
			} finally {
				setLoading(false);
			}
		})();
	}, [cardPackId, client, ownerUserId]);

	const handleGrade = async (grade: ReviewGrade) => {
		const current = queue[0];
		if (!current || !profileParams || !profileId) return;
		setGrading(true);

		const now = new Date();
		const existingState = states.get(current.id) ?? null;
		const previousSm2State = (existingState?.state as Sm2State) ?? null;

		const { nextState, dueAt } = sm2Scheduler.applyReview({
			previousState: previousSm2State,
			review: { grade, reviewedAt: now },
			params: profileParams,
		});

		try {
			const event = await createReviewEvent(client, {
				card_id: current.id,
				owner_user_id: ownerUserId,
				grade: REVIEW_GRADE_TO_VALUE[grade],
				time_ms: 0,
				raw_payload: null,
				reviewed_at: now.toISOString(),
			});

			const persisted = await upsertSchedulingState(client, existingState, {
				owner_user_id: ownerUserId,
				card_id: current.id,
				profile_id: profileId,
				due_at: dueAt.toISOString(),
				state: nextState,
				last_reviewed_at: now.toISOString(),
				last_event_id: event.id,
			});

			const updatedStates = new Map(states);
			updatedStates.set(current.id, persisted);
			setStates(updatedStates);
			setQueue(buildQueue(cards, Array.from(updatedStates.values())));
			setTotalReviewed((count) => count + 1);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to record review");
		} finally {
			setGrading(false);
		}
	};

	return {
		cardPack,
		queue,
		states,
		loading,
		error,
		grading,
		totalReviewed,
		profileId,
		handleGrade,
	};
}
