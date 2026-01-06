import type { ApiClient } from "./client";
import type {
	CardSchedulingStateInsert,
	CardSchedulingStateUpdate,
} from "./dtos/card-scheduling-state";
import type { CardSchedulingState } from "./entities/card-scheduling-state";
import { generateId, nowIso } from "./utils";

export async function listSchedulingStatesByCardIds(
	client: ApiClient,
	ownerUserId: string,
	cardIds: string[],
): Promise<CardSchedulingState[]> {
	if (cardIds.length === 0) return [];
	const cardIdSet = new Set(cardIds);
	return client.list("card_scheduling_state", {
		filter: (state) =>
			state.owner_user_id === ownerUserId && cardIdSet.has(state.card_id),
	});
}

export async function insertSchedulingState(
	client: ApiClient,
	input: CardSchedulingStateInsert,
): Promise<CardSchedulingState> {
	const record: CardSchedulingState = {
		id: generateId(),
		owner_user_id: input.owner_user_id,
		card_id: input.card_id,
		profile_id: input.profile_id,
		due_at: input.due_at,
		state: input.state,
		last_reviewed_at: input.last_reviewed_at,
		last_event_id: input.last_event_id ?? null,
		created_at: nowIso(),
	};

	await client.put("card_scheduling_state", record);
	return record;
}

export async function updateSchedulingState(
	client: ApiClient,
	stateId: string,
	ownerUserId: string,
	updates: CardSchedulingStateUpdate,
): Promise<CardSchedulingState | null> {
	const existing = await client.get("card_scheduling_state", stateId);
	if (!existing || existing.owner_user_id !== ownerUserId) return null;

	const updated: CardSchedulingState = {
		...existing,
		...updates,
	};

	await client.put("card_scheduling_state", updated);
	return updated;
}

export async function upsertSchedulingState(
	client: ApiClient,
	existing: CardSchedulingState | null,
	input: CardSchedulingStateInsert,
): Promise<CardSchedulingState> {
	if (existing) {
		const updated = await updateSchedulingState(
			client,
			existing.id,
			existing.owner_user_id,
			input,
		);
		return updated ?? { ...existing, ...input };
	}

	return insertSchedulingState(client, input);
}
