import type { ApiClient, QueryOptions } from "@/lib/api/client";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import {
	isFirestoreApiClient,
	listFirestoreRecords,
	ownedStoreCacheKey,
	ownershipConstraints,
} from "@/lib/api/firestore-client";

export type DailyReviewSettings = {
	dailyGoal: number;
	reviewPerDay: number;
	newPerDay: number;
};

export const DEFAULT_DAILY_REVIEW_SETTINGS: DailyReviewSettings = {
	dailyGoal: 30,
	reviewPerDay: 20,
	newPerDay: 10,
};
export const DAILY_REVIEW_PROGRESS_UPDATED_EVENT =
	"card-master:daily-review-progress-updated";

export type DailyReviewProgressUpdatedDetail = {
	accountUserId: string;
	profileId: string;
	completedDelta: number;
};

const MIN_SETTING_VALUE = 1;
const MAX_SETTING_VALUE = 999;

function normalizePositiveInteger(
	value: unknown,
	fallback: number,
): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return fallback;
	}
	const rounded = Math.round(value);
	if (rounded < MIN_SETTING_VALUE) return MIN_SETTING_VALUE;
	if (rounded > MAX_SETTING_VALUE) return MAX_SETTING_VALUE;
	return rounded;
}

export function normalizeDailyReviewSettings(
	input: Partial<DailyReviewSettings> | null | undefined,
): DailyReviewSettings {
	return {
		dailyGoal: normalizePositiveInteger(
			input?.dailyGoal,
			DEFAULT_DAILY_REVIEW_SETTINGS.dailyGoal,
		),
		reviewPerDay: normalizePositiveInteger(
			input?.reviewPerDay,
			DEFAULT_DAILY_REVIEW_SETTINGS.reviewPerDay,
		),
		newPerDay: normalizePositiveInteger(
			input?.newPerDay,
			DEFAULT_DAILY_REVIEW_SETTINGS.newPerDay,
		),
	};
}

function getTodayRange(now: Date): { start: Date; end: Date } {
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { start, end };
}

export async function countTodayCompletedCards(
	client: ApiClient,
	accountUserId: string,
	profileId: string,
	now: Date = new Date(),
): Promise<number> {
	const { start, end } = getTodayRange(now);
	const options: QueryOptions<ReviewEvent> = {
		filter: (event) => {
			if (event.account_user_id !== accountUserId) return false;
			if (event.profile_id !== profileId) return false;
			if (event.grade <= 1) return false;
			const reviewedAt = new Date(event.reviewed_at);
			return reviewedAt >= start && reviewedAt < end;
		},
		cacheKey: ownedStoreCacheKey(
			accountUserId,
			profileId,
			`today:${start.toISOString()}`,
		),
	};
	const events = isFirestoreApiClient(client)
		? await listFirestoreRecords(
				"review_event",
				ownershipConstraints(accountUserId, profileId),
				options,
			)
		: await client.list("review_event", options);

	return new Set(events.map((event) => event.card_id)).size;
}

export function isDailyGoalMet(completedToday: number, dailyGoal: number): boolean {
	return completedToday >= dailyGoal;
}

export function notifyDailyReviewProgressUpdated(
	detail?: DailyReviewProgressUpdatedDetail,
) {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent<DailyReviewProgressUpdatedDetail | undefined>(
			DAILY_REVIEW_PROGRESS_UPDATED_EVENT,
			{ detail },
		),
	);
}
