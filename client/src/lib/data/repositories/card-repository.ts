import { getDoc, where } from "firebase/firestore";

import type { CardUpdate } from "@/lib/api/dtos/card";
import type { Card, CardStatus } from "@/lib/api/entities/card";
import {
	generateId as defaultGenerateId,
	nowIso as defaultNow,
} from "@/lib/api/utils";
import { commitBatchedWrites } from "@/lib/data/firestore/batch-writer";
import { queryStoreRecords, storeDocRef } from "@/lib/data/firestore/firestore-store";
import {
	hasProfileOwnership,
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

export type BulkCreateCardInput = {
	accountUserId: string;
	profileId: string;
	cardPackId: string;
	cards: Array<{
		prompt: string;
		answer: string;
		question_content?: Card["question_content"];
		answer_content?: Card["answer_content"];
	}>;
};

type ProfileScopeInput = {
	accountUserId: string;
	profileId: string;
};

type LoadPackCardsInput = ProfileScopeInput & {
	cardPackId: string;
	status?: CardStatus;
};

type CreateCardInput = ProfileScopeInput & {
	cardPackId: string;
	prompt: string;
	answer: string;
	question_content?: Card["question_content"];
	answer_content?: Card["answer_content"];
	status?: CardStatus;
};

type UpdateCardInput = ProfileScopeInput & {
	cardId: string;
	updates: CardUpdate;
};

type DeleteCardInput = ProfileScopeInput & {
	cardId: string;
};

function sortByCreatedAt<T extends { created_at: string }>(records: T[]): T[] {
	return [...records].sort(
		(a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
	);
}

async function readCardFromFirestore(cardId: string): Promise<Card | null> {
	const snapshot = await getDoc(storeDocRef("card", cardId));
	if (!snapshot.exists()) return null;
	const data = snapshot.data();
	return {
		...data,
		id: typeof data.id === "string" && data.id.length > 0 ? data.id : snapshot.id,
	} as Card;
}

export function createCardRepository(deps: RepositoryDeps = {}) {
	const now = deps.now ?? defaultNow;
	const generateId = deps.generateId ?? defaultGenerateId;

	async function loadPackCards({
		accountUserId,
		profileId,
		cardPackId,
		status,
	}: LoadPackCardsInput): Promise<Card[]> {
		const records = deps.db
			? deps.db.card.filter(
					(card) =>
						hasProfileOwnership(card, accountUserId, profileId) &&
						card.card_pack_id === cardPackId,
				)
			: (
					await queryStoreRecords("card", [
						...profileOwnershipConstraints(accountUserId, profileId),
						where("card_pack_id", "==", cardPackId),
					])
				).filter((card) => hasProfileOwnership(card, accountUserId, profileId));

		return sortByCreatedAt(
			status ? records.filter((card) => card.status === status) : records,
		);
	}

	async function createCard(input: CreateCardInput): Promise<Card> {
		const [created] = await bulkCreateCards({
			accountUserId: input.accountUserId,
			profileId: input.profileId,
			cardPackId: input.cardPackId,
			cards: [
				{
					prompt: input.prompt,
					answer: input.answer,
					question_content: input.question_content,
					answer_content: input.answer_content,
				},
			],
		});
		if (!created) throw new Error("Card input is required");
		if (input.status === undefined || input.status === created.status) return created;
		return updateCard({
			accountUserId: input.accountUserId,
			profileId: input.profileId,
			cardId: created.id,
			updates: { status: input.status },
		});
	}

	async function updateCard({
		accountUserId,
		profileId,
		cardId,
		updates,
	}: UpdateCardInput): Promise<Card> {
		const existing = deps.db
			? deps.db.card.find((card) => card.id === cardId) ?? null
			: await readCardFromFirestore(cardId);
		if (!existing || !hasProfileOwnership(existing, accountUserId, profileId)) {
			throw new Error("Card not found");
		}

		const updated: Card = {
			...existing,
			...updates,
			updated_at: now(),
		};

		if (deps.db) {
			upsertRecord(deps.db, "card", updated);
			return updated;
		}

		await commitBatchedWrites(
			[{ type: "set", ref: storeDocRef("card", updated.id), value: updated }],
			{
				invalidate: () => clearQueryCache({ accountUserId, profileId }),
			},
		);
		return updated;
	}

	async function deleteCard({
		accountUserId,
		profileId,
		cardId,
	}: DeleteCardInput): Promise<void> {
		const existing = deps.db
			? deps.db.card.find((card) => card.id === cardId) ?? null
			: await readCardFromFirestore(cardId);
		if (!existing || !hasProfileOwnership(existing, accountUserId, profileId)) return;

		if (deps.db) {
			deleteRecord(deps.db, "card", existing.id);
			return;
		}

		await commitBatchedWrites(
			[{ type: "delete", ref: storeDocRef("card", existing.id) }],
			{
				invalidate: () => clearQueryCache({ accountUserId, profileId }),
			},
		);
	}

	async function bulkCreateCards({
		accountUserId,
		profileId,
		cardPackId,
		cards,
	}: BulkCreateCardInput): Promise<Card[]> {
		const createdAt = now();
		const records = cards.map<Card>((card) => ({
			id: generateId(),
			card_pack_id: cardPackId,
			account_user_id: accountUserId,
			profile_id: profileId,
			owner_user_id: profileId,
			prompt: card.prompt,
			answer: card.answer,
			question_content: card.question_content ?? null,
			answer_content: card.answer_content ?? null,
			status: "active",
			created_at: createdAt,
			updated_at: null,
		}));

		if (deps.db) {
			for (const record of records) {
				upsertRecord(deps.db, "card", record);
			}
			return records;
		}

		await commitBatchedWrites(
			records.map((record) => ({
				type: "set",
				ref: storeDocRef("card", record.id),
				value: record,
			})),
			{
				invalidate: () => clearQueryCache({ accountUserId, profileId }),
			},
		);
		return records;
	}

	return { loadPackCards, createCard, updateCard, deleteCard, bulkCreateCards };
}
