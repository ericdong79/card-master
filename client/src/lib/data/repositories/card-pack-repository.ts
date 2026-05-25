import { getDoc, where } from "firebase/firestore";

import type { CardPackUpdate } from "@/lib/api/dtos/card-pack";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack, CardPackType } from "@/lib/api/entities/card-pack";
import { DEFAULT_CARD_PACK_TYPE } from "@/lib/api/entities/card-pack";
import {
	generateId as defaultGenerateId,
	nowIso as defaultNow,
} from "@/lib/api/utils";
import {
	commitBatchedWrites,
	type BatchOperation,
} from "@/lib/data/firestore/batch-writer";
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
	deleteRecord,
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

type CreateCardPackInput = ProfileScopeInput & {
	name: string;
	type?: CardPackType;
	status?: CardPack["status"];
};

type UpdateCardPackInput = ProfileScopeInput & {
	cardPackId: string;
	updates: CardPackUpdate;
};

type DeletePackInput = ProfileScopeInput & {
	cardPackId: string;
};

export type CardPackWithCounts = CardPack & {
	cards_count: number;
};

function sortByCreatedAt<T extends { created_at: string }>(records: T[]): T[] {
	return [...records].sort(
		(a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
	);
}

async function readPackFromFirestore(cardPackId: string): Promise<CardPack | null> {
	const snapshot = await getDoc(storeDocRef("card_pack", cardPackId));
	if (!snapshot.exists()) return null;
	const data = snapshot.data();
	return {
		...data,
		id: typeof data.id === "string" && data.id.length > 0 ? data.id : snapshot.id,
	} as CardPack;
}

function testDbPackCards(
	db: RepositoryTestDb,
	accountUserId: string,
	profileId: string,
	cardPackId: string,
): Card[] {
	return db.card.filter(
		(card) =>
			hasProfileOwnership(card, accountUserId, profileId) &&
			card.card_pack_id === cardPackId,
	);
}

export function createCardPackRepository(deps: RepositoryDeps = {}) {
	const now = deps.now ?? defaultNow;
	const generateId = deps.generateId ?? defaultGenerateId;

	async function listCardPacks({
		accountUserId,
		profileId,
	}: ProfileScopeInput): Promise<CardPack[]> {
		const records = deps.db
			? deps.db.card_pack.filter((pack) =>
					hasProfileOwnership(pack, accountUserId, profileId),
				)
			: (
					await queryStoreRecords(
						"card_pack",
						profileOwnershipConstraints(accountUserId, profileId),
					)
				).filter((pack) => hasProfileOwnership(pack, accountUserId, profileId));

		return sortByCreatedAt(records);
	}

	async function createCardPack({
		accountUserId,
		profileId,
		name,
		type = DEFAULT_CARD_PACK_TYPE,
		status = "active",
	}: CreateCardPackInput): Promise<CardPack> {
		const record: CardPack = {
			id: generateId(),
			name,
			type,
			account_user_id: accountUserId,
			profile_id: profileId,
			owner_user_id: profileId,
			status,
			created_at: now(),
			updated_at: null,
		};

		if (deps.db) {
			upsertRecord(deps.db, "card_pack", record);
			return record;
		}

		await commitBatchedWrites(
			[{ type: "set", ref: storeDocRef("card_pack", record.id), value: record }],
			{
				invalidate: () => clearQueryCache({ accountUserId, profileId }),
			},
		);
		return record;
	}

	async function updateCardPack({
		accountUserId,
		profileId,
		cardPackId,
		updates,
	}: UpdateCardPackInput): Promise<CardPack | null> {
		const existing = deps.db
			? deps.db.card_pack.find((pack) => pack.id === cardPackId) ?? null
			: await readPackFromFirestore(cardPackId);
		if (!existing || !hasProfileOwnership(existing, accountUserId, profileId)) {
			return null;
		}

		const updated: CardPack = {
			...existing,
			...updates,
			updated_at: now(),
		};

		if (deps.db) {
			upsertRecord(deps.db, "card_pack", updated);
			return updated;
		}

		await commitBatchedWrites(
			[{ type: "set", ref: storeDocRef("card_pack", updated.id), value: updated }],
			{
				invalidate: () => clearQueryCache({ accountUserId, profileId }),
			},
		);
		return updated;
	}

	async function productionPackCards({
		accountUserId,
		profileId,
		cardPackId,
	}: DeletePackInput): Promise<Card[]> {
		const records = await queryStoreRecords("card", [
			...profileOwnershipConstraints(accountUserId, profileId),
			where("card_pack_id", "==", cardPackId),
		]);
		return records.filter((card) =>
			hasProfileOwnership(card, accountUserId, profileId),
		);
	}

	async function productionReviewDataDeleteOperations(
		accountUserId: string,
		profileId: string,
		cardIds: string[],
	): Promise<BatchOperation[]> {
		const operations: BatchOperation[] = [];
		const chunks = chunkFirestoreInValues(cardIds);

		for (const chunk of chunks) {
			const [masteryStates, schedulingStates, reviewEvents] = await Promise.all([
				queryStoreRecords("card_mastery_state", [
					...profileOwnershipConstraints(accountUserId, profileId),
					where("card_id", "in", chunk),
				]),
				queryStoreRecords("card_scheduling_state", [
					...learnerOwnershipConstraints(accountUserId, profileId),
					where("card_id", "in", chunk),
				]),
				queryStoreRecords("review_event", [
					...profileOwnershipConstraints(accountUserId, profileId),
					where("card_id", "in", chunk),
				]),
			]);

			for (const state of masteryStates) {
				if (hasProfileOwnership(state, accountUserId, profileId)) {
					operations.push({
						type: "delete",
						ref: storeDocRef("card_mastery_state", state.id),
					});
				}
			}
			for (const state of schedulingStates) {
				if (hasLearnerOwnership(state, accountUserId, profileId)) {
					operations.push({
						type: "delete",
						ref: storeDocRef("card_scheduling_state", state.id),
					});
				}
			}
			for (const event of reviewEvents) {
				if (hasProfileOwnership(event, accountUserId, profileId)) {
					operations.push({
						type: "delete",
						ref: storeDocRef("review_event", event.id),
					});
				}
			}
		}

		return operations;
	}

	async function deletePackWithData({
		accountUserId,
		profileId,
		cardPackId,
	}: DeletePackInput): Promise<void> {
		const cards = deps.db
			? testDbPackCards(deps.db, accountUserId, profileId, cardPackId)
			: await productionPackCards({ accountUserId, profileId, cardPackId });
		const pack = deps.db
			? deps.db.card_pack.find((item) => item.id === cardPackId) ?? null
			: await readPackFromFirestore(cardPackId);
		if (pack && !hasProfileOwnership(pack, accountUserId, profileId)) return;
		if (!pack && cards.length === 0) return;

		if (deps.db) {
			const cardIds = new Set(cards.map((card) => card.id));

			for (const state of [...deps.db.card_mastery_state]) {
				if (
					hasProfileOwnership(state, accountUserId, profileId) &&
					cardIds.has(state.card_id)
				) {
					deleteRecord(deps.db, "card_mastery_state", state.id);
				}
			}
			for (const state of [...deps.db.card_scheduling_state]) {
				if (
					hasLearnerOwnership(state, accountUserId, profileId) &&
					cardIds.has(state.card_id)
				) {
					deleteRecord(deps.db, "card_scheduling_state", state.id);
				}
			}
			for (const event of [...deps.db.review_event]) {
				if (
					hasProfileOwnership(event, accountUserId, profileId) &&
					cardIds.has(event.card_id)
				) {
					deleteRecord(deps.db, "review_event", event.id);
				}
			}
			for (const card of cards) {
				deleteRecord(deps.db, "card", card.id);
			}
			if (pack) {
				deleteRecord(deps.db, "card_pack", pack.id);
			}
			return;
		}

		const cardIds = cards.map((card) => card.id);
		const operations: BatchOperation[] = [
			...(await productionReviewDataDeleteOperations(
				accountUserId,
				profileId,
				cardIds,
			)),
			...cards.map<BatchOperation>((card) => ({
				type: "delete",
				ref: storeDocRef("card", card.id),
			})),
		];
		if (pack) {
			operations.push({ type: "delete", ref: storeDocRef("card_pack", pack.id) });
		}

		await commitBatchedWrites(operations, {
			invalidate: () => clearQueryCache({ accountUserId, profileId }),
		});
	}

	return { listCardPacks, createCardPack, updateCardPack, deletePackWithData };
}
