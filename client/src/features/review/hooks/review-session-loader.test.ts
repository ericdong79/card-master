import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/api/entities/card";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { SchedulingProfile } from "@/lib/api/entities/scheduling-profile";
import { buildSm2ReviewSession, mapCardPacksById } from "./review-session-loader";

const card: Card = {
	id: "card-1",
	card_pack_id: "pack-1",
	account_user_id: "account-1",
	profile_id: "profile-1",
	owner_user_id: "profile-1",
	prompt: "Q",
	answer: "A",
	question_content: null,
	answer_content: null,
	status: "active",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: null,
};

const schedulingProfile: SchedulingProfile = {
	id: "sched-profile-1",
	account_user_id: "account-1",
	profile_id: "profile-1",
	owner_user_id: "profile-1",
	algorithm_key: "sm2",
	version: 1,
	parameters: {},
	created_at: "2026-01-01T00:00:00.000Z",
};

describe("buildSm2ReviewSession", () => {
	it("uses remaining daily goal when the goal is not met", () => {
		const result = buildSm2ReviewSession({
			accountUserId: "account-1",
			profileId: "profile-1",
			cards: [card],
			schedulingStates: [],
			schedulingProfile,
			completedToday: 2,
			settings: { dailyGoal: 5, reviewPerDay: 20, newPerDay: 10 },
		});

		expect(result.sessionTotalLimit).toBe(3);
		expect(result.reviewCardsLimit).toBe(20);
		expect(result.newCardsLimit).toBe(10);
		expect(result.session.getCurrentCard()?.id).toBe("card-1");
	});

	it("uses review plus new limits when the daily goal is already met", () => {
		const result = buildSm2ReviewSession({
			accountUserId: "account-1",
			profileId: "profile-1",
			cards: [card],
			schedulingStates: [],
			schedulingProfile,
			completedToday: 5,
			settings: { dailyGoal: 5, reviewPerDay: 7, newPerDay: 3 },
		});

		expect(result.sessionTotalLimit).toBe(10);
		expect(result.reviewCardsLimit).toBe(7);
		expect(result.newCardsLimit).toBe(3);
	});
});

describe("mapCardPacksById", () => {
	it("indexes packs by id", () => {
		const pack: CardPack = {
			id: "pack-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			owner_user_id: "profile-1",
			name: "Pack 1",
			type: "basic",
			status: "active",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: null,
		};

		expect(mapCardPacksById([pack])).toHaveProperty("pack-1.name", "Pack 1");
	});
});
