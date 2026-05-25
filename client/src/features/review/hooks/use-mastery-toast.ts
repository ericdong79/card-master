import { useEffect, useState } from "react";

import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import type { ReviewGrade } from "@/lib/scheduling/types";

export type MasteryToastFeedback = {
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

export function useMasteryToast(
	feedback: MasteryToastFeedback,
	enabled: boolean,
	ttlMs = 2800,
): MasteryToastFeedback {
	const [visibleFeedback, setVisibleFeedback] =
		useState<MasteryToastFeedback>(null);

	useEffect(() => {
		if (!enabled || !feedback) {
			const clearTimer = window.setTimeout(() => {
				setVisibleFeedback(null);
			}, 0);

			return () => {
				window.clearTimeout(clearTimer);
			};
		}

		const showTimer = window.setTimeout(() => {
			setVisibleFeedback(feedback);
		}, 0);
		const hideTimer = window.setTimeout(() => {
			setVisibleFeedback(null);
		}, ttlMs);

		return () => {
			window.clearTimeout(showTimer);
			window.clearTimeout(hideTimer);
		};
	}, [enabled, feedback, ttlMs]);

	return visibleFeedback;
}
