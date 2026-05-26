import { limit as firestoreLimit, orderBy, where } from "firebase/firestore";

import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import { normalizeCardSchedulingState } from "@/lib/api/schemas/card-scheduling-state";
import { parseSm2Parameters } from "@/lib/api/schemas/sm2-parameters";
import {
	generateId as defaultGenerateId,
	nowIso as defaultNow,
} from "@/lib/api/utils";
import { SM2_DEFAULT_PARAMETERS } from "@/lib/scheduling/sm2/const";
import { commitBatchedWrites } from "@/lib/data/firestore/batch-writer";
import { queryStoreRecords, storeDocRef } from "@/lib/data/firestore/firestore-store";
import { chunkFirestoreInValues } from "@/lib/data/firestore/id-chunks";
import {
	hasLearnerOwnership,
	hasProfileOwnership,
	learnerOwnershipConstraints,
	profileOwnershipConstraints,
} from "@/lib/data/firestore/ownership";
import { clearQueryCache } from "@/lib/data/firestore/query-cache";

import {
	upsertRecord,
	type RepositoryTestDb,
} from "./repository-test-utils";

export type RepositoryDeps = {
	db?: RepositoryTestDb;
	now?: () => string;
	generateId?: () => string;
};

type ProfileScopeInput = {
	accountUserId: string;
	profileId: string;
};

type CardIdsInput = ProfileScopeInput & {
	cardIds: string[];
};

type DueWindowInput = ProfileScopeInput & {
	asOf: string;
	limit: number;
};

const DEFAULT_PROFILE = {
	algorithm_key: "sm2",
	version: 1,
	parameters: { ...SM2_DEFAULT_PARAMETERS },
};

function sortByCreatedAt<T extends { created_at: string }>(records: T[]): T[] {
	return [...records].sort(
		(a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
	);
}

export function createSchedulingRepository(deps: RepositoryDeps = {}) {
	const now = deps.now ?? defaultNow;
	const generateId = deps.generateId ?? defaultGenerateId;

	async function fetchSchedulingProfile({
		accountUserId,
		profileId,
	}: ProfileScopeInput): Promise<SchedulingProfile | null> {
		const records = deps.db
			? deps.db.scheduling_profile.filter((profile) =>
					hasProfileOwnership(profile, accountUserId, profileId),
				)
			: (
					await queryStoreRecords(
						"scheduling_profile",
						profileOwnershipConstraints(accountUserId, profileId),
					)
				).filter((profile) =>
					hasProfileOwnership(profile, accountUserId, profileId),
				);

		const first = sortByCreatedAt(records)[0];
		if (!first) return null;
		// Validate the algorithm parameters at the Firestore boundary so
		// downstream callers receive a known-good shape. Today only SM-2 is
		// supported — when we add more algorithms, branch on `algorithm_key`.
		return {
			...first,
			parameters:
				first.algorithm_key === "sm2"
					? (parseSm2Parameters(first.parameters) as unknown as Record<
							string,
							unknown
						>)
					: first.parameters,
		};
	}

	async function getOrCreateSchedulingProfile(
		input: ProfileScopeInput,
	): Promise<SchedulingProfile> {
		const existing = await fetchSchedulingProfile(input);
		if (existing) return existing;

		const record: SchedulingProfile = {
			id: generateId(),
			account_user_id: input.accountUserId,
			profile_id: input.profileId,
			owner_user_id: input.profileId,
			algorithm_key: DEFAULT_PROFILE.algorithm_key,
			parameters: { ...DEFAULT_PROFILE.parameters },
			version: DEFAULT_PROFILE.version,
			created_at: now(),
		};

		if (deps.db) {
			upsertRecord(deps.db, "scheduling_profile", record);
			return record;
		}

		await commitBatchedWrites(
			[{ type: "set", ref: storeDocRef("scheduling_profile", record.id), value: record }],
			{
				invalidate: () =>
					clearQueryCache({
						accountUserId: input.accountUserId,
						profileId: input.profileId,
					}),
			},
		);
		return record;
	}

	async function listSchedulingStatesByCardIds({
		accountUserId,
		profileId,
		cardIds,
	}: CardIdsInput): Promise<CardSchedulingState[]> {
		if (cardIds.length === 0) return [];
		const cardIdSet = new Set(cardIds);

		if (deps.db) {
			return deps.db.card_scheduling_state
				.filter(
					(state) =>
						hasLearnerOwnership(state, accountUserId, profileId) &&
						cardIdSet.has(state.card_id),
				)
				.map(normalizeCardSchedulingState);
		}

		const chunks = chunkFirestoreInValues(cardIds);
		const records = await Promise.all(
			chunks.map((chunk) =>
				queryStoreRecords("card_scheduling_state", [
					...learnerOwnershipConstraints(accountUserId, profileId),
					where("card_id", "in", chunk),
				]),
			),
		);

		return records
			.flat()
			.filter(
				(state) =>
					hasLearnerOwnership(state, accountUserId, profileId) &&
					cardIdSet.has(state.card_id),
			)
			.map(normalizeCardSchedulingState);
	}

	/**
	 * Returns the next batch of due scheduling states for a profile, ordered by
	 * `due_at` ascending. Used by the global review session loader to avoid
	 * fetching every active scheduling state up front.
	 *
	 * NOTE: This is a narrow addition added by the review-pagination work. The
	 * parallel firestore-filters worktree may add a similar helper — at merge
	 * time keep one canonical implementation.
	 */
	async function listDueSchedulingStatesForProfile({
		accountUserId,
		profileId,
		asOf,
		limit,
	}: DueWindowInput): Promise<CardSchedulingState[]> {
		if (limit <= 0) return [];

		if (deps.db) {
			return deps.db.card_scheduling_state
				.filter(
					(state) =>
						hasLearnerOwnership(state, accountUserId, profileId) &&
						state.due_at <= asOf,
				)
				.sort((a, b) => a.due_at.localeCompare(b.due_at))
				.slice(0, limit)
				.map(normalizeCardSchedulingState);
		}

		const records = await queryStoreRecords("card_scheduling_state", [
			...learnerOwnershipConstraints(accountUserId, profileId),
			where("due_at", "<=", asOf),
			orderBy("due_at", "asc"),
			firestoreLimit(limit),
		]);

		return records
			.filter((state) =>
				hasLearnerOwnership(state, accountUserId, profileId),
			)
			.map(normalizeCardSchedulingState);
	}

	async function listSchedulingStatesForProfile({
		accountUserId,
		profileId,
	}: ProfileScopeInput): Promise<CardSchedulingState[]> {
		const records = deps.db
			? deps.db.card_scheduling_state.filter((state) =>
					hasLearnerOwnership(state, accountUserId, profileId),
				)
			: (
					await queryStoreRecords(
						"card_scheduling_state",
						learnerOwnershipConstraints(accountUserId, profileId),
					)
				).filter((state) =>
					hasLearnerOwnership(state, accountUserId, profileId),
				);

		return records.map(normalizeCardSchedulingState);
	}

	return {
		fetchSchedulingProfile,
		getOrCreateSchedulingProfile,
		listSchedulingStatesByCardIds,
		listSchedulingStatesForProfile,
		listDueSchedulingStatesForProfile,
	};
}
