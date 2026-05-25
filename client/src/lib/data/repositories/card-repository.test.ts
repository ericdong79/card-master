import { describe, expect, it } from "vitest";

import { createCardRepository } from "./card-repository";
import { createRepositoryTestDb } from "./repository-test-utils";

describe("createCardRepository", () => {
	it("bulk creates cards with cloud ownership", async () => {
		const db = createRepositoryTestDb();
		const ids = ["card-1", "card-2"];
		const repository = createCardRepository({
			db,
			generateId: () => ids.shift() ?? "extra-card",
			now: () => "2026-01-02T00:00:00.000Z",
		});

		const cards = await repository.bulkCreateCards({
			accountUserId: "account-1",
			profileId: "profile-1",
			cardPackId: "pack-1",
			cards: [
				{ prompt: "ni hao", answer: "你好" },
				{
					prompt: "zhong guo",
					answer: "中国",
					question_content: { text: "zhong guo" },
					answer_content: { text: "中国" },
				},
			],
		});

		expect(cards).toHaveLength(2);
		expect(db.card).toEqual([
			{
				id: "card-1",
				card_pack_id: "pack-1",
				account_user_id: "account-1",
				profile_id: "profile-1",
				owner_user_id: "profile-1",
				prompt: "ni hao",
				answer: "你好",
				question_content: null,
				answer_content: null,
				status: "active",
				created_at: "2026-01-02T00:00:00.000Z",
				updated_at: null,
			},
			{
				id: "card-2",
				card_pack_id: "pack-1",
				account_user_id: "account-1",
				profile_id: "profile-1",
				owner_user_id: "profile-1",
				prompt: "zhong guo",
				answer: "中国",
				question_content: { text: "zhong guo" },
				answer_content: { text: "中国" },
				status: "active",
				created_at: "2026-01-02T00:00:00.000Z",
				updated_at: null,
			},
		]);
	});

	it("loads only active cards owned by the account and learner profile", async () => {
		const db = createRepositoryTestDb({
			card: [
				{
					id: "card-1",
					card_pack_id: "pack-1",
					account_user_id: "account-1",
					profile_id: "profile-1",
					owner_user_id: "profile-1",
					prompt: "Q1",
					answer: "A1",
					question_content: null,
					answer_content: null,
					status: "active",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: null,
				},
				{
					id: "card-2",
					card_pack_id: "pack-2",
					account_user_id: "account-1",
					profile_id: "profile-2",
					owner_user_id: "profile-2",
					prompt: "Q2",
					answer: "A2",
					question_content: null,
					answer_content: null,
					status: "active",
					created_at: "2026-01-02T00:00:00.000Z",
					updated_at: null,
				},
				{
					id: "card-3",
					card_pack_id: "pack-1",
					account_user_id: "account-1",
					profile_id: "profile-1",
					owner_user_id: "profile-1",
					prompt: "Q3",
					answer: "A3",
					question_content: null,
					answer_content: null,
					status: "deleted",
					created_at: "2026-01-03T00:00:00.000Z",
					updated_at: null,
				},
				{
					id: "card-4",
					card_pack_id: "pack-1",
					account_user_id: "account-2",
					profile_id: "profile-1",
					owner_user_id: "profile-1",
					prompt: "Q4",
					answer: "A4",
					question_content: null,
					answer_content: null,
					status: "active",
					created_at: "2026-01-04T00:00:00.000Z",
					updated_at: null,
				},
			],
		});

		const cards = await createCardRepository({ db }).loadProfileCards({
			accountUserId: "account-1",
			profileId: "profile-1",
		});

		expect(cards.map((card) => card.id)).toEqual(["card-1"]);
	});
});
