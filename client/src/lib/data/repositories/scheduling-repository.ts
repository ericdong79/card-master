import { where } from "firebase/firestore";

import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
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

		return sortByCreatedAt(records)[0] ?? null;
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
			return deps.db.card_scheduling_state.filter(
				(state) =>
					hasLearnerOwnership(state, accountUserId, profileId) &&
					cardIdSet.has(state.card_id),
			);
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
			);
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

		return records;
	}

	async function listDueSchedulingStatesForProfile({
		accountUserId,
		profileId,
		now: dueBefore,
	}: ProfileScopeInput & { now: string }): Promise<CardSchedulingState[]> {
		const records = deps.db
			? deps.db.card_scheduling_state.filter(
					(state) =>
						hasLearnerOwnership(state, accountUserId, profileId) &&
						Date.parse(state.due_at) <= Date.parse(dueBefore),
				)
			: (
					await queryStoreRecords("card_scheduling_state", [
						...learnerOwnershipConstraints(accountUserId, profileId),
						where("due_at", "<=", dueBefore),
					])
				).filter((state) =>
					hasLearnerOwnership(state, accountUserId, profileId),
				);

		return records;
	}

	return {
		fetchSchedulingProfile,
		getOrCreateSchedulingProfile,
		listSchedulingStatesByCardIds,
		listSchedulingStatesForProfile,
		listDueSchedulingStatesForProfile,
	};
}
