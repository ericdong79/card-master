import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import {
	createReviewRepository,
	type MasteryFeedback,
} from "@/lib/data/repositories/review-repository";
import type { ReviewResult } from "@/lib/review";
import type { ReviewGrade } from "@/lib/scheduling/types";

export type { MasteryFeedback };

type PersistReviewResultInput = {
	accountUserId: string;
	profileId: string;
	grade: ReviewGrade;
	result: ReviewResult;
	existingState: CardSchedulingState | null;
	onMasteryFeedback: (feedback: MasteryFeedback) => void;
};

export async function persistReviewResult({
	accountUserId,
	profileId,
	grade,
	result,
	existingState,
	onMasteryFeedback,
}: PersistReviewResultInput): Promise<void> {
	const persisted = await createReviewRepository().persistReviewResult({
		accountUserId,
		profileId,
		grade,
		result,
		existingState,
	});
	onMasteryFeedback(persisted.masteryFeedback);
}
