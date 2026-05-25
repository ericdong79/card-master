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
});
