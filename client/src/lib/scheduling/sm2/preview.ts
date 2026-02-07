import type { ReviewGrade } from "@/lib/scheduling/types";
import type { Sm2Parameters, Sm2State } from "@/lib/scheduling/types/sm2-types";
import { sm2Scheduler } from "./sm2";

export type GradePreview = {
	grade: ReviewGrade;
	label: string;
	subLabel: string;
};

/**
 * Format a duration in milliseconds to a human-readable string
 * Examples:
 * - < 1 minute: "< 1m"
 * - < 1 hour: "15m"
 * - < 1 day: "6h"
 * - < 30 days: "12d"
 * - >= 30 days: "2mo"
 * - >= 365 days: "1y"
 */
export function formatDuration(ms: number): string {
	const minutes = Math.ceil(ms / (1000 * 60));
	const hours = Math.ceil(ms / (1000 * 60 * 60));
	const days = ms / (1000 * 60 * 60 * 24);
	const months = Math.floor(days / 30);
	const years = Math.floor(days / 365);

	if (minutes < 1) {
		return "< 1m";
	}
	if (minutes < 60) {
		return `${minutes}m`;
	}
	if (hours < 24) {
		return `${hours}h`;
	}
	if (days < 30) {
		return `${Math.ceil(days)}d`;
	}
	if (days < 365) {
		return `${months}mo`;
	}
	return `${years}y`;
}

/**
 * Preview the next due time for a specific grade without applying the review.
 * This is used to show the user what will happen if they select each grade.
 */
export function previewGradeDueAt(
	grade: ReviewGrade,
	state: Sm2State | null,
	params: Sm2Parameters,
	now: Date = new Date(),
): Date {
	const result = sm2Scheduler.applyReview({
		previousState: state,
		review: { grade, reviewedAt: now },
		params,
	});

	return result.dueAt;
}

/**
 * Get preview information for all grades.
 * Returns the subLabel (formatted duration) for each grade option.
 */
export function getGradePreviews(
	state: Sm2State | null,
	params: Sm2Parameters,
	now: Date = new Date(),
): Record<ReviewGrade, string> {
	const grades: ReviewGrade[] = ["again", "hard", "good", "easy"];
	const previews: Partial<Record<ReviewGrade, string>> = {};

	for (const grade of grades) {
		try {
			const dueAt = previewGradeDueAt(grade, state, params, now);
			const durationMs = dueAt.getTime() - now.getTime();
			previews[grade] = formatDuration(durationMs);
		} catch {
			// Fallback if preview fails
			previews[grade] = "?";
		}
	}

	return previews as Record<ReviewGrade, string>;
}

/**
 * Default labels for SM-2 grades
 */
export const SM2_GRADE_LABELS: Record<ReviewGrade, string> = {
	again: "Again",
	hard: "Hard",
	good: "Good",
	easy: "Easy",
};

/**
 * Create SM-2 button configuration with dynamic subLabels
 */
export function createSm2ButtonConfig(
	state: Sm2State | null,
	params: Sm2Parameters,
	now: Date = new Date(),
): Array<{
	grade: ReviewGrade;
	label: string;
	subLabel: string;
	variant: "default" | "outline" | "destructive" | "secondary";
}> {
	const previews = getGradePreviews(state, params, now);

	return [
		{
			grade: "again",
			label: SM2_GRADE_LABELS.again,
			subLabel: previews.again,
			variant: "destructive",
		},
		{
			grade: "hard",
			label: SM2_GRADE_LABELS.hard,
			subLabel: previews.hard,
			variant: "secondary",
		},
		{
			grade: "good",
			label: SM2_GRADE_LABELS.good,
			subLabel: previews.good,
			variant: "default",
		},
		{
			grade: "easy",
			label: SM2_GRADE_LABELS.easy,
			subLabel: previews.easy,
			variant: "outline",
		},
	];
}
