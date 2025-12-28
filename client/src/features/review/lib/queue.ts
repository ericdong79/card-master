import type { Card } from "@/lib/api/entities/card";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";

export function buildQueue(cards: Card[], states: CardSchedulingState[]): Card[] {
	const now = Date.now();
	const stateMap = new Map(states.map((s) => [s.card_id, s]));
	return cards
		.filter((card) => {
			const state = stateMap.get(card.id);
			if (!state) return true;
			const dueMs = Date.parse(state.due_at ?? new Date().toISOString());
			return Number.isFinite(dueMs) ? dueMs <= now : true;
		})
		.sort((a, b) => {
			const aDue = stateMap.get(a.id)?.due_at;
			const bDue = stateMap.get(b.id)?.due_at;
			return Date.parse(aDue ?? "1970-01-01") - Date.parse(bDue ?? "1970-01-01");
		});
}
