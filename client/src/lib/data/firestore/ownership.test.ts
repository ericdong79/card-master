import { describe, expect, it } from "vitest";

import {
	hasLearnerOwnership,
	hasProfileOwnership,
	profileScope,
} from "./ownership";

describe("Firestore ownership helpers", () => {
	it("accepts records owned by the active profile", () => {
		expect(
			hasProfileOwnership(
				{
					account_user_id: "account-1",
					profile_id: "profile-1",
					owner_user_id: "profile-1",
				},
				"profile-1",
			),
		).toBe(true);
	});

	it("rejects cross-profile records", () => {
		expect(
			hasProfileOwnership(
				{
					account_user_id: "account-2",
					profile_id: "profile-2",
					owner_user_id: "profile-2",
				},
				"profile-1",
			),
		).toBe(false);
	});

	it("creates a repository profile scope", () => {
		expect(profileScope("account-1", "profile-1")).toEqual({
			accountUserId: "account-1",
			profileId: "profile-1",
		});
	});

	it("accepts learner-owned records for the active profile", () => {
		expect(
			hasLearnerOwnership(
				{
					account_user_id: "account-1",
					learner_profile_id: "profile-1",
					owner_user_id: "profile-1",
				},
				"profile-1",
			),
		).toBe(true);
	});
});
