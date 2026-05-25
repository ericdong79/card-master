import { computeMasteryUpdate } from "@/features/mastery";
import { notifyDailyReviewProgressUpdated } from "@/features/review/daily-goal";
import {
	getMasteryStateByCardId,
	upsertMasteryState,
} from "@/lib/api/card-mastery-state";
import type { ApiClient } from "@/lib/api/client";
import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import { createReviewEvent } from "@/lib/api/review-event";
import { upsertSchedulingState } from "@/lib/api/scheduling-state";
import type { ReviewResult } from "@/lib/review";
import type { ReviewGrade, Sm2State } from "@/lib/scheduling/types";

export type MasteryFeedback = {
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
};

type PersistReviewResultInput = {
	client: ApiClient;
	accountUserId: string;
	profileId: string;
	grade: ReviewGrade;
	result: ReviewResult;
	existingState: CardSchedulingState | null;
	onMasteryFeedback: (feedback: MasteryFeedback) => void;
};

export async function persistReviewResult({
	client,
	accountUserId,
	profileId,
	grade,
	result,
	existingState,
	onMasteryFeedback,
}: PersistReviewResultInput): Promise<void> {
	const event: ReviewEvent = await createReviewEvent(client, result.reviewEvent);

	await upsertSchedulingState(
		client,
		accountUserId,
		profileId,
		existingState,
		{
			...result.schedulingState,
			last_event_id: event.id,
		},
	);

	const existingMastery = await getMasteryStateByCardId(
		client,
		accountUserId,
		profileId,
		result.reviewEvent.card_id,
	);
	const masteryUpdate = computeMasteryUpdate({
		existing: existingMastery,
		ownerUserId: profileId,
		accountUserId,
		profileId,
		cardId: result.reviewEvent.card_id,
		grade,
		now: new Date(result.reviewEvent.reviewed_at),
		previousDueAt: existingState ? new Date(existingState.due_at) : null,
		nextDueAt: result.nextDueAt,
		previousSm2State: (existingState?.state as Sm2State | null) ?? null,
		nextSm2State: result.schedulingState.state as Sm2State,
	});

	await upsertMasteryState(
		client,
		accountUserId,
		profileId,
		existingMastery,
		masteryUpdate.nextMastery,
	);
	onMasteryFeedback({
		cardId: result.reviewEvent.card_id,
		transition: masteryUpdate.transition,
		rating: grade,
		isFirstLearn: masteryUpdate.isFirstLearn,
	});

	if (grade !== "again") {
		notifyDailyReviewProgressUpdated({
			accountUserId,
			profileId,
			completedDelta: 1,
		});
	}
}
