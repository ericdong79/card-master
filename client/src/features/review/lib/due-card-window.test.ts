import { describe, expect, it } from "vitest";
import { createCardRepository } from "@/lib/data/repositories/card-repository";
import { createRepositoryTestDb } from "@/lib/data/repositories/repository-test-utils";
import { createSchedulingRepository } from "@/lib/data/repositories/scheduling-repository";

import { loadDueCardWindow } from "./due-card-window";

function makeCard(id: string, packId = "pack-1"): {
	id: string;
	card_pack_id: string;
	account_user_id: string;
	profile_id: string;
	owner_user_id: string;
	prompt: string;
	answer: string;
	question_content: null;
	answer_content: null;
	status: "active";
	created_at: string;
	updated_at: null;
} {
	return {
		id,
		card_pack_id: packId,
		account_user_id: "account-1",
		profile_id: "profile-1",
		owner_user_id: "profile-1",
		prompt: `Q-${id}`,
		answer: `A-${id}`,
		question_content: null,
		answer_content: null,
		status: "active",
		created_at: `2026-01-01T00:00:00.00${id.slice(-1)}Z`,
		updated_at: null,
	};
}

function makeState(cardId: string, dueAt: string) {
	return {
		id: `state-${cardId}`,
		card_id: cardId,
		owner_user_id: "profile-1",
		account_user_id: "account-1",
		learner_profile_id: "profile-1",
		profile_id: "sched-1",
		due_at: dueAt,
		state: { phase: "review" },
		last_reviewed_at: "2026-01-01T00:00:00.000Z",
		last_event_id: null,
		created_at: "2026-01-01T00:00:00.000Z",
	};
}

describe("loadDueCardWindow", () => {
	it("returns only due cards up to the limit and reports hasMoreDue", async () => {
		const db = createRepositoryTestDb({
			card: [makeCard("c1"), makeCard("c2"), makeCard("c3")],
			card_scheduling_state: [
				makeState("c1", "2026-01-01T00:00:00.000Z"),
				makeState("c2", "2026-01-02T00:00:00.000Z"),
				makeState("c3", "2026-01-03T00:00:00.000Z"),
			],
		});
		const cardRepository = createCardRepository({ db });
		const schedulingRepository = createSchedulingRepository({ db });

		const result = await loadDueCardWindow({
			accountUserId: "account-1",
			profileId: "profile-1",
			activeCardPackIds: new Set(["pack-1"]),
			dueLimit: 2,
			newLimit: 0,
			asOf: new Date("2026-01-10T00:00:00.000Z"),
			cardRepository,
			schedulingRepository,
		});

		expect(result.cards.map((card) => card.id)).toEqual(["c1", "c2"]);
		expect(result.schedulingStates.map((state) => state.card_id)).toEqual([
			"c1",
			"c2",
		]);
		expect(result.hasMoreDue).toBe(true);
		expect(result.hasMoreNew).toBe(false);
	});

	it("includes new cards (no scheduling state) when newLimit > 0", async () => {
		const db = createRepositoryTestDb({
			card: [makeCard("c1"), makeCard("c2"), makeCard("new1"), makeCard("new2")],
			card_scheduling_state: [
				makeState("c1", "2026-01-01T00:00:00.000Z"),
				makeState("c2", "2026-01-02T00:00:00.000Z"),
			],
		});
		const cardRepository = createCardRepository({ db });
		const schedulingRepository = createSchedulingRepository({ db });

		const result = await loadDueCardWindow({
			accountUserId: "account-1",
			profileId: "profile-1",
			activeCardPackIds: new Set(["pack-1"]),
			dueLimit: 10,
			newLimit: 1,
			asOf: new Date("2026-01-10T00:00:00.000Z"),
			cardRepository,
			schedulingRepository,
		});

		expect(result.cards.map((card) => card.id).sort()).toEqual([
			"c1",
			"c2",
			"new1",
		]);
		expect(result.hasMoreDue).toBe(false);
		expect(result.hasMoreNew).toBe(true);
	});

	it("excludes cards belonging to inactive packs", async () => {
		const db = createRepositoryTestDb({
			card: [makeCard("c1", "pack-1"), makeCard("c2", "pack-archived")],
			card_scheduling_state: [
				makeState("c1", "2026-01-01T00:00:00.000Z"),
				makeState("c2", "2026-01-02T00:00:00.000Z"),
			],
		});
		const cardRepository = createCardRepository({ db });
		const schedulingRepository = createSchedulingRepository({ db });

		const result = await loadDueCardWindow({
			accountUserId: "account-1",
			profileId: "profile-1",
			activeCardPackIds: new Set(["pack-1"]),
			dueLimit: 10,
			newLimit: 0,
			asOf: new Date("2026-01-10T00:00:00.000Z"),
			cardRepository,
			schedulingRepository,
		});

		expect(result.cards.map((card) => card.id)).toEqual(["c1"]);
		expect(result.schedulingStates.map((state) => state.card_id)).toEqual([
			"c1",
		]);
	});
});
