import { describe, expect, it } from "vitest";

import { createRepositoryTestDb } from "./repository-test-utils";
import {
	createProfileRepository,
	type CloudUserProfile,
} from "./profile-repository";

const now = "2026-01-02T00:00:00.000Z";

function profile(id: string, accountUserId = "account-1"): CloudUserProfile {
	return {
		id,
		account_user_id: accountUserId,
		nickname: id,
		avatar_emoji: "🙂",
		primary_color: null,
		hanzi_font: "default",
		sidebar_background: "nav-illustration",
		daily_goal: 20,
		review_per_day: 10,
		new_per_day: 10,
		created_at: now,
		updated_at: null,
		last_used_at: now,
	};
}

describe("createProfileRepository", () => {
	it("deletes profile-owned data, learner scheduling data, profile, and updates the account current profile", async () => {
		const db = createRepositoryTestDb({
			card_pack: [
				{
					id: "pack-delete",
					name: "Delete",
					owner_user_id: "profile-delete",
					account_user_id: "account-1",
					profile_id: "profile-delete",
					status: "active",
					created_at: now,
					updated_at: null,
				},
				{
					id: "pack-keep",
					name: "Keep",
					owner_user_id: "profile-keep",
					account_user_id: "account-1",
					profile_id: "profile-keep",
					status: "active",
					created_at: now,
					updated_at: null,
				},
			],
			card: [
				{
					id: "card-delete",
					card_pack_id: "pack-delete",
					owner_user_id: "profile-delete",
					account_user_id: "account-1",
					profile_id: "profile-delete",
					prompt: "delete",
					answer: "delete",
					status: "active",
					created_at: now,
					updated_at: null,
				},
				{
					id: "card-keep",
					card_pack_id: "pack-keep",
					owner_user_id: "profile-keep",
					account_user_id: "account-1",
					profile_id: "profile-keep",
					prompt: "keep",
					answer: "keep",
					status: "active",
					created_at: now,
					updated_at: null,
				},
			],
			scheduling_profile: [
				{
					id: "schedule-profile-delete",
					owner_user_id: "profile-delete",
					account_user_id: "account-1",
					profile_id: "profile-delete",
					algorithm_key: "sm2",
					parameters: {},
					version: 1,
					created_at: now,
				},
				{
					id: "schedule-profile-keep",
					owner_user_id: "profile-keep",
					account_user_id: "account-1",
					profile_id: "profile-keep",
					algorithm_key: "sm2",
					parameters: {},
					version: 1,
					created_at: now,
				},
			],
			card_mastery_state: [
				{
					id: "mastery-delete",
					owner_user_id: "profile-delete",
					account_user_id: "account-1",
					profile_id: "profile-delete",
					card_id: "card-delete",
					mastery_score: 10,
					mastery_state: "learning",
					easy_streak: 0,
					recent_outcomes: [true],
					created_at: now,
					updated_at: now,
				},
				{
					id: "mastery-keep",
					owner_user_id: "profile-keep",
					account_user_id: "account-1",
					profile_id: "profile-keep",
					card_id: "card-keep",
					mastery_score: 10,
					mastery_state: "learning",
					easy_streak: 0,
					recent_outcomes: [true],
					created_at: now,
					updated_at: now,
				},
			],
			card_scheduling_state: [
				{
					id: "learner-state-delete",
					owner_user_id: "profile-delete",
					account_user_id: "account-1",
					learner_profile_id: "profile-delete",
					card_id: "card-delete",
					profile_id: "schedule-profile-delete",
					due_at: now,
					state: {},
					last_reviewed_at: now,
					last_event_id: null,
					created_at: now,
				},
				{
					id: "learner-state-keep",
					owner_user_id: "profile-keep",
					account_user_id: "account-1",
					learner_profile_id: "profile-keep",
					card_id: "card-keep",
					profile_id: "schedule-profile-keep",
					due_at: now,
					state: {},
					last_reviewed_at: now,
					last_event_id: null,
					created_at: now,
				},
			],
			review_event: [
				{
					id: "review-delete",
					card_id: "card-delete",
					owner_user_id: "profile-delete",
					account_user_id: "account-1",
					profile_id: "profile-delete",
					grade: 3,
					time_ms: 1000,
					raw_payload: null,
					reviewed_at: now,
					created_at: now,
				},
				{
					id: "review-keep",
					card_id: "card-keep",
					owner_user_id: "profile-keep",
					account_user_id: "account-1",
					profile_id: "profile-keep",
					grade: 3,
					time_ms: 1000,
					raw_payload: null,
					reviewed_at: now,
					created_at: now,
				},
			],
		});
		const repository = createProfileRepository({ db });
		await repository.saveCloudProfileAndSetCurrentProfile(
			profile("profile-delete"),
			now,
		);
		await repository.saveCloudProfile(profile("profile-keep"));

		await repository.deleteProfileWithData(
			"account-1",
			"profile-delete",
			"profile-keep",
			"2026-01-03T00:00:00.000Z",
		);

		expect(db.card_pack.map((record) => record.id)).toEqual(["pack-keep"]);
		expect(db.card.map((record) => record.id)).toEqual(["card-keep"]);
		expect(db.scheduling_profile.map((record) => record.id)).toEqual([
			"schedule-profile-keep",
		]);
		expect(db.card_mastery_state.map((record) => record.id)).toEqual([
			"mastery-keep",
		]);
		expect(db.card_scheduling_state.map((record) => record.id)).toEqual([
			"learner-state-keep",
		]);
		expect(db.review_event.map((record) => record.id)).toEqual(["review-keep"]);
		expect(repository.getTestProfiles?.().map((record) => record.id)).toEqual([
			"profile-keep",
		]);
		expect(repository.getTestAccount?.("account-1")).toMatchObject({
			id: "account-1",
			current_profile_id: "profile-keep",
			updated_at: "2026-01-03T00:00:00.000Z",
		});
	});
});
