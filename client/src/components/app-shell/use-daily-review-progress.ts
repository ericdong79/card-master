import { useEffect, useState } from "react";
import type { UserProfile } from "@/features/profile/profile-context";
import {
	DAILY_REVIEW_PROGRESS_UPDATED_EVENT,
	type DailyReviewProgressUpdatedDetail,
	isDailyGoalMet,
} from "@/features/review/daily-goal";
import { createReviewRepository } from "@/lib/data/repositories/review-repository";

export type DailyReviewProgress = {
	completed: number;
	goal: number;
	isMet: boolean;
};

/**
 * Tracks the current profile's daily review progress.
 *
 * Loads today's completed-card count on mount/profile-change, then listens for
 * incremental updates dispatched by the review session and re-fetches on
 * unrelated events for safety.
 */
export function useDailyReviewProgress(
	accountUserId: string | null | undefined,
	currentProfile: UserProfile | null,
	pathname: string,
): DailyReviewProgress | null {
	const [completedToday, setCompletedToday] = useState(0);

	useEffect(() => {
		if (!accountUserId || !currentProfile) {
			return;
		}

		let cancelled = false;
		const loadProgress = async () => {
			try {
				const count = await createReviewRepository().countTodayCompletedCards({
					accountUserId,
					profileId: currentProfile.id,
				});
				if (!cancelled) {
					setCompletedToday(count);
				}
			} catch {
				if (!cancelled) {
					setCompletedToday(0);
				}
			}
		};

		void loadProgress();

		const handleProgressUpdated = (event: Event) => {
			const detail = (event as CustomEvent<DailyReviewProgressUpdatedDetail | undefined>)
				.detail;
			if (
				detail?.accountUserId === accountUserId &&
				detail.profileId === currentProfile.id
			) {
				setCompletedToday((count) => count + detail.completedDelta);
				return;
			}
			void loadProgress();
		};
		window.addEventListener(
			DAILY_REVIEW_PROGRESS_UPDATED_EVENT,
			handleProgressUpdated,
		);

		return () => {
			cancelled = true;
			window.removeEventListener(
				DAILY_REVIEW_PROGRESS_UPDATED_EVENT,
				handleProgressUpdated,
			);
		};
	}, [accountUserId, currentProfile, pathname]);

	if (!currentProfile) {
		return null;
	}

	return {
		completed: completedToday,
		goal: currentProfile.daily_goal,
		isMet: isDailyGoalMet(completedToday, currentProfile.daily_goal),
	};
}
