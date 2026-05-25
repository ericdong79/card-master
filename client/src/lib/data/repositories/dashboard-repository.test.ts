import { describe, expect, it } from "vitest";

import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";

import { createDashboardRepository } from "./dashboard-repository";
import { createRepositoryTestDb } from "./repository-test-utils";

const accountUserId = "account-1";
const profileId = "profile-1";
const now = "2026-01-02T00:00:00.000Z";

function pack(id: string, overrides: Partial<CardPack> = {}): CardPack {
	return {
		id,
		name: id,
		type: "pinyin-hanzi",
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
		status: "active",
		created_at: `${id}-created`,
		updated_at: null,
		...overrides,
	};
}

function card(id: string, cardPackId: string, overrides: Partial<Card> = {}): Card {
	return {
		id,
		card_pack_id: cardPackId,
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
		prompt: id,
		answer: id,
		question_content: null,
		answer_content: null,
		status: "active",
		created_at: `${id}-created`,
		updated_at: null,
		...overrides,
	};
}

function schedulingState(
	id: string,
	cardId: string,
	dueAt: string,
	overrides: Partial<CardSchedulingState> = {},
): CardSchedulingState {
	return {
		id,
		card_id: cardId,
		account_user_id: accountUserId,
		learner_profile_id: profileId,
		owner_user_id: profileId,
		profile_id: "sm2-profile",
		due_at: dueAt,
		state: {},
		last_reviewed_at: now,
		last_event_id: null,
		created_at: now,
		...overrides,
	};
}

describe("createDashboardRepository", () => {
	it("returns pack counts and due count for one profile", async () => {
		const db = createRepositoryTestDb({
			card_pack: [
				pack("pack-1", { created_at: "2026-01-01T00:00:00.000Z" }),
				pack("pack-2", { created_at: "2026-01-01T00:01:00.000Z" }),
				pack("other-profile-pack", {
					account_user_id: accountUserId,
					profile_id: "profile-2",
					owner_user_id: "profile-2",
				}),
			],
			card: [
				card("card-1", "pack-1"),
				card("card-2", "pack-1"),
				card("card-3", "pack-2"),
				card("other-profile-card", "other-profile-pack", {
					account_user_id: accountUserId,
					profile_id: "profile-2",
					owner_user_id: "profile-2",
				}),
			],
			card_scheduling_state: [
				schedulingState("state-1", "card-1", "2026-01-03T00:00:00.000Z"),
				schedulingState("state-3", "card-3", "2026-01-01T00:00:00.000Z"),
				schedulingState(
					"other-profile-state",
					"other-profile-card",
					"2026-01-01T00:00:00.000Z",
					{
						account_user_id: accountUserId,
						learner_profile_id: "profile-2",
						owner_user_id: "profile-2",
					},
				),
			],
		});

		const repository = createDashboardRepository({
			db,
			now: () => now,
		});

		const dashboard = await repository.loadHomeDashboard({
			accountUserId,
			profileId,
		});

		expect(
			dashboard.cardPacks.map((item) => ({
				id: item.id,
				cards_count: item.cards_count,
			})),
		).toEqual([
			{ id: "pack-1", cards_count: 2 },
			{ id: "pack-2", cards_count: 1 },
		]);
		expect(dashboard.dueCardsCount).toBe(2);
	});
});
