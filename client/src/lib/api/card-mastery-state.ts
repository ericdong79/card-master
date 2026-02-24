import type { ApiClient } from "./client";
import type {
	CardMasteryStateInsert,
	CardMasteryStateUpdate,
} from "./dtos/card-mastery-state";
import type { CardMasteryState } from "./entities/card-mastery-state";
import { generateId, nowIso } from "./utils";

function clampScore(score: unknown): number {
	if (typeof score !== "number" || Number.isNaN(score)) return 0;
	return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeMasteryStateValue(value: unknown): CardMasteryState["mastery_state"] {
	switch (value) {
		case "learning":
		case "graduated":
		case "reviewing":
		case "mastered":
			return value;
		default:
			return "unseen";
	}
}

export function normalizeCardMasteryState(record: CardMasteryState): CardMasteryState {
	return {
		...record,
		mastery_score: clampScore(record.mastery_score),
		mastery_state: normalizeMasteryStateValue(record.mastery_state),
		easy_streak:
			typeof record.easy_streak === "number" && record.easy_streak > 0
				? Math.floor(record.easy_streak)
				: 0,
		recent_outcomes: Array.isArray(record.recent_outcomes)
			? record.recent_outcomes.map((item) => Boolean(item))
			: [],
		updated_at: typeof record.updated_at === "string" ? record.updated_at : nowIso(),
	};
}

export async function listMasteryStatesByCardIds(
	client: ApiClient,
	ownerUserId: string,
	cardIds: string[],
): Promise<CardMasteryState[]> {
	if (cardIds.length === 0) return [];
	const cardIdSet = new Set(cardIds);
	const records = await client.list("card_mastery_state", {
		filter: (state) =>
			state.owner_user_id === ownerUserId && cardIdSet.has(state.card_id),
	});
	return records.map((record) => normalizeCardMasteryState(record));
}

export async function getMasteryStateByCardId(
	client: ApiClient,
	ownerUserId: string,
	cardId: string,
): Promise<CardMasteryState | null> {
	const states = await listMasteryStatesByCardIds(client, ownerUserId, [cardId]);
	return states[0] ? normalizeCardMasteryState(states[0]) : null;
}

export async function insertMasteryState(
	client: ApiClient,
	input: CardMasteryStateInsert,
): Promise<CardMasteryState> {
	const timestamp = nowIso();
	const record: CardMasteryState = normalizeCardMasteryState({
		id: generateId(),
		owner_user_id: input.owner_user_id,
		card_id: input.card_id,
		mastery_score: input.mastery_score,
		mastery_state: input.mastery_state,
		easy_streak: input.easy_streak,
		recent_outcomes: input.recent_outcomes,
		created_at: timestamp,
		updated_at: timestamp,
	});

	await client.put("card_mastery_state", record);
	return record;
}

export async function updateMasteryState(
	client: ApiClient,
	stateId: string,
	ownerUserId: string,
	updates: CardMasteryStateUpdate,
): Promise<CardMasteryState | null> {
	const existing = await client.get("card_mastery_state", stateId);
	if (!existing || existing.owner_user_id !== ownerUserId) return null;

	const updated: CardMasteryState = normalizeCardMasteryState({
		...existing,
		...updates,
		updated_at: nowIso(),
	});

	await client.put("card_mastery_state", updated);
	return updated;
}

export async function upsertMasteryState(
	client: ApiClient,
	existing: CardMasteryState | null,
	input: CardMasteryStateInsert,
): Promise<CardMasteryState> {
	if (existing) {
		const updated = await updateMasteryState(client, existing.id, existing.owner_user_id, {
			mastery_score: input.mastery_score,
			mastery_state: input.mastery_state,
			easy_streak: input.easy_streak,
			recent_outcomes: input.recent_outcomes,
		});
		return updated
			? normalizeCardMasteryState(updated)
			: normalizeCardMasteryState({ ...existing, ...input, updated_at: nowIso() });
	}

	return insertMasteryState(client, input);
}
