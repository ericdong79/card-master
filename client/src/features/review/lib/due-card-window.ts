import type { Card } from "@/lib/api/entities/card";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { createCardRepository } from "@/lib/data/repositories/card-repository";
import type { createSchedulingRepository } from "@/lib/data/repositories/scheduling-repository";

/**
 * Result of a windowed load: the cards eligible for this session, the
 * scheduling states for those cards (if any), and whether the underlying
 * pools were larger than the requested window (i.e. more cards exist
 * beyond what was loaded).
 */
export type DueCardWindow = {
	cards: Card[];
	schedulingStates: CardSchedulingState[];
	/** True when the due-window query hit its limit (more due cards remain). */
	hasMoreDue: boolean;
	/** True when the new-card pool was truncated (more new cards remain). */
	hasMoreNew: boolean;
};

export type DueCardWindowInput = {
	accountUserId: string;
	profileId: string;
	activeCardPackIds: Set<string>;
	dueLimit: number;
	newLimit: number;
	asOf?: Date;
	cardRepository: ReturnType<typeof createCardRepository>;
	schedulingRepository: ReturnType<typeof createSchedulingRepository>;
};

/**
 * Loads only the cards needed for the next review session window instead of
 * the entire active-card and scheduling-state collections.
 *
 * Strategy:
 *  1. Page the next `dueLimit` due scheduling states ordered by `due_at`
 *     ascending — capped, so a 500-card profile no longer pulls every state.
 *  2. Hydrate just those cards via batched `where("id", "in", chunk)` queries.
 *  3. If the session still wants new cards, fetch the profile's active card
 *     pool and pick the first `newLimit` that have no scheduling state. This
 *     "new pool" load is the residual cost — we keep it bounded by only
 *     issuing it when newLimit > 0.
 *
 * Returned cards/states preserve the contract expected by
 * `buildSm2ReviewSession` (`ReviewSession.create` does the final selection).
 */
export async function loadDueCardWindow({
	accountUserId,
	profileId,
	activeCardPackIds,
	dueLimit,
	newLimit,
	asOf = new Date(),
	cardRepository,
	schedulingRepository,
}: DueCardWindowInput): Promise<DueCardWindow> {
	const asOfIso = asOf.toISOString();

	// Fetch due window with a +1 probe so we can report hasMoreDue accurately.
	const dueFetchLimit = dueLimit > 0 ? dueLimit + 1 : 0;
	const dueStatesRaw = await schedulingRepository.listDueSchedulingStatesForProfile({
		accountUserId,
		profileId,
		asOf: asOfIso,
		limit: dueFetchLimit,
	});

	const hasMoreDue = dueStatesRaw.length > dueLimit;
	const dueStates = dueStatesRaw.slice(0, dueLimit);
	const dueCardIds = dueStates.map((state) => state.card_id);

	const dueCardsRaw =
		dueCardIds.length > 0
			? await cardRepository.loadCardsByIds({
					accountUserId,
					profileId,
					cardIds: dueCardIds,
				})
			: [];

	// Drop cards from inactive packs or non-active status.
	const dueCards = dueCardsRaw.filter(
		(card) =>
			card.status === "active" && activeCardPackIds.has(card.card_pack_id),
	);
	const dueCardIdSet = new Set(dueCards.map((card) => card.id));
	const usableDueStates = dueStates.filter((state) =>
		dueCardIdSet.has(state.card_id),
	);

	if (newLimit <= 0) {
		return {
			cards: dueCards,
			schedulingStates: usableDueStates,
			hasMoreDue,
			hasMoreNew: false,
		};
	}

	// New-card pool: load the active card list and skip those already
	// scheduled. We still need this collection for the "new" phase, but it is
	// only loaded when the session has room for new cards.
	const allActiveCards = await cardRepository.loadProfileCards({
		accountUserId,
		profileId,
	});
	const scheduledCardIds = new Set(dueCardIds);
	const newCandidates = allActiveCards.filter(
		(card) =>
			activeCardPackIds.has(card.card_pack_id) &&
			!scheduledCardIds.has(card.id) &&
			!dueCardIdSet.has(card.id),
	);

	const hasMoreNew = newCandidates.length > newLimit;
	const newCards = newCandidates.slice(0, newLimit);

	// Combine: due cards keep their scheduling states; new cards have none.
	const cards = [...dueCards, ...newCards];

	return {
		cards,
		schedulingStates: usableDueStates,
		hasMoreDue,
		hasMoreNew,
	};
}
