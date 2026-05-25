import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import { nowIso as defaultNow } from "@/lib/api/utils";
import { queryStoreRecords } from "@/lib/data/firestore/firestore-store";
import {
	hasProfileOwnership,
	profileOwnershipConstraints,
} from "@/lib/data/firestore/ownership";

import {
	createSchedulingRepository,
	type RepositoryDeps,
} from "./scheduling-repository";

export type HomeDashboardCardPack = CardPack & {
	cards_count: number;
};

export type HomeDashboard = {
	cardPacks: HomeDashboardCardPack[];
	dueCardsCount: number;
};

type LoadHomeDashboardInput = {
	accountUserId: string;
	profileId: string;
};

function sortByCreatedAt<T extends { created_at: string }>(records: T[]): T[] {
	return [...records].sort(
		(a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
	);
}

function profileRecords<T extends { status?: string }>(
	records: T[],
	status = "active",
): T[] {
	return records.filter((record) => record.status === status);
}

export function createDashboardRepository(deps: RepositoryDeps = {}) {
	const now = deps.now ?? defaultNow;
	const schedulingRepository = createSchedulingRepository(deps);

	async function loadProfilePacks(
		accountUserId: string,
		profileId: string,
	): Promise<CardPack[]> {
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

		return sortByCreatedAt(profileRecords(records));
	}

	async function loadProfileCards(
		accountUserId: string,
		profileId: string,
	): Promise<Card[]> {
		const records = deps.db
			? deps.db.card.filter((card) =>
					hasProfileOwnership(card, accountUserId, profileId),
				)
			: (
					await queryStoreRecords(
						"card",
						profileOwnershipConstraints(accountUserId, profileId),
					)
				).filter((card) => hasProfileOwnership(card, accountUserId, profileId));

		return profileRecords(records);
	}

	async function loadHomeDashboard({
		accountUserId,
		profileId,
	}: LoadHomeDashboardInput): Promise<HomeDashboard> {
		const [cardPacks, cards] = await Promise.all([
			loadProfilePacks(accountUserId, profileId),
			loadProfileCards(accountUserId, profileId),
		]);
		const activePackIds = new Set(cardPacks.map((pack) => pack.id));
		const cardsInActivePacks = cards.filter((card) =>
			activePackIds.has(card.card_pack_id),
		);

		const countsByPackId = new Map<string, number>();
		for (const card of cardsInActivePacks) {
			countsByPackId.set(
				card.card_pack_id,
				(countsByPackId.get(card.card_pack_id) ?? 0) + 1,
			);
		}

		const schedulingStates =
			cardsInActivePacks.length > 0
				? await schedulingRepository.listSchedulingStatesForProfile({
						accountUserId,
						profileId,
					})
				: [];
		const statesByCardId = new Map(
			schedulingStates.map((state) => [state.card_id, state]),
		);
		const nowTime = Date.parse(now());
		const dueCardsCount = cardsInActivePacks.reduce((count, card) => {
			const state = statesByCardId.get(card.id);
			if (!state) return count + 1;
			return Date.parse(state.due_at) <= nowTime ? count + 1 : count;
		}, 0);

		return {
			cardPacks: cardPacks.map((pack) => ({
				...pack,
				cards_count: countsByPackId.get(pack.id) ?? 0,
			})),
			dueCardsCount,
		};
	}

	return { loadHomeDashboard };
}
