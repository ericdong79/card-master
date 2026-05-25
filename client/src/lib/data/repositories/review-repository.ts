import { where } from "firebase/firestore";

import { computeMasteryUpdate } from "@/features/mastery";
import {
	notifyDailyReviewProgressUpdated,
	type DailyReviewProgressUpdatedDetail,
} from "@/features/review/daily-goal";
import { normalizeCardMasteryState } from "@/lib/api/card-mastery-state";
import { clearFirestoreReadCache } from "@/lib/api/firestore-client";
import type { StoreName } from "@/lib/api/client";
import type { ReviewEventInsert } from "@/lib/api/dtos/review-event";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";
import {
	generateId as defaultGenerateId,
	nowIso as defaultNow,
} from "@/lib/api/utils";
import {
	commitBatchedWrites,
	type BatchOperation,
} from "@/lib/data/firestore/batch-writer";
import { queryStoreRecords, storeDocRef } from "@/lib/data/firestore/firestore-store";
import {
	hasLearnerOwnership,
	hasProfileOwnership,
	profileOwnershipConstraints,
} from "@/lib/data/firestore/ownership";
import { clearQueryCache } from "@/lib/data/firestore/query-cache";
import type { ReviewResult } from "@/lib/review";
import type { ReviewGrade, Sm2State } from "@/lib/scheduling/types";

import {
	upsertRecord,
	type RepositoryTestDb,
} from "./repository-test-utils";

export type MasteryFeedback = {
	cardId: string;
	transition: {
		beforeScore: number;
		afterScore: number;
		beforeState: CardMasteryState["mastery_state"];
		afterState: CardMasteryState["mastery_state"];
		delta: number;
	};
	rating: ReviewGrade;
	isFirstLearn: boolean;
};

type NotifyDailyProgress = (detail: DailyReviewProgressUpdatedDetail) => void;
type ClearLegacyReadCache = (store?: StoreName) => void;

export type RepositoryDeps = {
	db?: RepositoryTestDb;
	now?: () => string;
	generateId?: () => string;
	notifyDailyProgress?: NotifyDailyProgress;
	clearLegacyReadCache?: ClearLegacyReadCache;
};

export type PersistReviewResultInput = {
	accountUserId: string;
	profileId: string;
	grade: ReviewGrade;
	result: ReviewResult;
	existingState: CardSchedulingState | null;
};

export type PersistReviewResultOutput = {
	reviewEvent: ReviewEvent;
	schedulingState: CardSchedulingState;
	masteryState: CardMasteryState;
	masteryFeedback: MasteryFeedback;
};

type ProfileScopeInput = {
	accountUserId: string;
	profileId: string;
};

type CountTodayCompletedCardsInput = ProfileScopeInput & {
	now?: Date;
};

function getTodayRange(now: Date): { start: Date; end: Date } {
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { start, end };
}

async function readMasteryStateByCardId(
	accountUserId: string,
	profileId: string,
	cardId: string,
): Promise<CardMasteryState | null> {
	const records = await queryStoreRecords("card_mastery_state", [
		...profileOwnershipConstraints(accountUserId, profileId),
		where("card_id", "==", cardId),
	]);
	const record = records.find(
		(state) =>
			state.card_id === cardId &&
			hasProfileOwnership(state, accountUserId, profileId),
	);
	return record ? normalizeCardMasteryState(record) : null;
}

function testDbMasteryStateByCardId(
	db: RepositoryTestDb,
	accountUserId: string,
	profileId: string,
	cardId: string,
): CardMasteryState | null {
	const record = db.card_mastery_state.find(
		(state) =>
			state.card_id === cardId &&
			hasProfileOwnership(state, accountUserId, profileId),
	);
	return record ? normalizeCardMasteryState(record) : null;
}

function buildSchedulingState(
	existing: CardSchedulingState | null,
	result: ReviewResult,
	eventId: string,
	now: string,
	generateId: () => string,
): CardSchedulingState {
	if (existing) {
		return {
			...existing,
			...result.schedulingState,
			last_event_id: eventId,
		};
	}

	return {
		id: generateId(),
		...result.schedulingState,
		last_event_id: eventId,
		created_at: now,
	};
}

function buildMasteryState(
	existing: CardMasteryState | null,
	nextMastery: ReturnType<typeof computeMasteryUpdate>["nextMastery"],
	now: string,
	generateId: () => string,
): CardMasteryState {
	if (existing) {
		return normalizeCardMasteryState({
			...existing,
			mastery_score: nextMastery.mastery_score,
			mastery_state: nextMastery.mastery_state,
			easy_streak: nextMastery.easy_streak,
			recent_outcomes: nextMastery.recent_outcomes,
			updated_at: now,
		});
	}

	return normalizeCardMasteryState({
		id: generateId(),
		...nextMastery,
		created_at: now,
		updated_at: now,
	});
}

export function createReviewRepository(deps: RepositoryDeps = {}) {
	const now = deps.now ?? defaultNow;
	const generateId = deps.generateId ?? defaultGenerateId;
	const notifyDailyProgress =
		deps.notifyDailyProgress ?? notifyDailyReviewProgressUpdated;
	const clearLegacyReadCache =
		deps.clearLegacyReadCache ?? clearFirestoreReadCache;

	async function countTodayCompletedCards({
		accountUserId,
		profileId,
		now: currentDate = new Date(),
	}: CountTodayCompletedCardsInput): Promise<number> {
		const { start, end } = getTodayRange(currentDate);

		const records = deps.db
			? deps.db.review_event.filter((event) =>
					hasProfileOwnership(event, accountUserId, profileId),
				)
			: (
					await queryStoreRecords(
						"review_event",
						profileOwnershipConstraints(accountUserId, profileId),
					)
				).filter((event) =>
					hasProfileOwnership(event, accountUserId, profileId),
				);

		const completed = records.filter((event) => {
			if (event.grade <= 1) return false;
			const reviewedAt = new Date(event.reviewed_at);
			return reviewedAt >= start && reviewedAt < end;
		});

		return new Set(completed.map((event) => event.card_id)).size;
	}

	async function createReviewEvent(input: ReviewEventInsert): Promise<ReviewEvent> {
		const event: ReviewEvent = {
			...input,
			id: generateId(),
			created_at: now(),
		};

		if (!hasProfileOwnership(event, input.account_user_id, input.profile_id)) {
			throw new Error("Review event ownership mismatch");
		}

		if (deps.db) {
			upsertRecord(deps.db, "review_event", event);
			return event;
		}

		await commitBatchedWrites(
			[{ type: "set", ref: storeDocRef("review_event", event.id), value: event }],
			{
				invalidate: () => {
					clearQueryCache({
						accountUserId: input.account_user_id,
						profileId: input.profile_id,
					});
					clearLegacyReadCache("review_event");
				},
			},
		);

		return event;
	}

	async function persistReviewResult({
		accountUserId,
		profileId,
		grade,
		result,
		existingState,
	}: PersistReviewResultInput): Promise<PersistReviewResultOutput> {
		const timestamp = now();
		const event: ReviewEvent = {
			...result.reviewEvent,
			id: generateId(),
			created_at: timestamp,
		};
		const schedulingState = buildSchedulingState(
			existingState,
			result,
			event.id,
			timestamp,
			generateId,
		);

		if (
			!hasLearnerOwnership(schedulingState, accountUserId, profileId) ||
			schedulingState.card_id !== result.reviewEvent.card_id
		) {
			throw new Error("Scheduling state ownership mismatch");
		}

		const existingMastery = deps.db
			? testDbMasteryStateByCardId(
					deps.db,
					accountUserId,
					profileId,
					result.reviewEvent.card_id,
				)
			: await readMasteryStateByCardId(
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
		const masteryState = buildMasteryState(
			existingMastery,
			masteryUpdate.nextMastery,
			timestamp,
			generateId,
		);
		const masteryFeedback: MasteryFeedback = {
			cardId: result.reviewEvent.card_id,
			transition: masteryUpdate.transition,
			rating: grade,
			isFirstLearn: masteryUpdate.isFirstLearn,
		};

		if (deps.db) {
			upsertRecord(deps.db, "review_event", event);
			upsertRecord(deps.db, "card_scheduling_state", schedulingState);
			upsertRecord(deps.db, "card_mastery_state", masteryState);
		} else {
			const operations: BatchOperation[] = [
				{ type: "set", ref: storeDocRef("review_event", event.id), value: event },
				{
					type: "set",
					ref: storeDocRef("card_scheduling_state", schedulingState.id),
					value: schedulingState,
				},
				{
					type: "set",
					ref: storeDocRef("card_mastery_state", masteryState.id),
					value: masteryState,
				},
			];
			await commitBatchedWrites(operations, {
				invalidate: () => {
					clearQueryCache({ accountUserId, profileId });
					clearLegacyReadCache("review_event");
					clearLegacyReadCache("card_scheduling_state");
					clearLegacyReadCache("card_mastery_state");
				},
			});
		}

		if (grade !== "again") {
			notifyDailyProgress({
				accountUserId,
				profileId,
				completedDelta: 1,
			});
		}

		return { reviewEvent: event, schedulingState, masteryState, masteryFeedback };
	}

	return { countTodayCompletedCards, createReviewEvent, persistReviewResult };
}
