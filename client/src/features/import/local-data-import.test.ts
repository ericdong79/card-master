import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/features/profile/profile-context";
import type { ApiClient } from "@/lib/data/store-client";
import type { LocalDataImportSource } from "./local-data-import";
import {
	createImportPlan,
	getCompletedLocalDataImportMarker,
	writeImportPlan,
} from "./local-data-import";

const saveManyCloudProfilesMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/profile/profile-repository", () => ({
	saveManyCloudProfiles: saveManyCloudProfilesMock,
}));

const timestamp = "2026-01-01T00:00:00.000Z";

function profile(id: string): UserProfile {
	return {
		id,
		nickname: id,
		avatar_emoji: "😀",
		primary_color: null,
		hanzi_font: "default",
		sidebar_background: "none",
		daily_goal: 10,
		review_per_day: 10,
		new_per_day: 5,
		created_at: timestamp,
		updated_at: null,
		last_used_at: timestamp,
	};
}

function createSource(): LocalDataImportSource {
	return {
		profileState: {
			profiles: [profile("learner-a"), profile("learner-b")],
			current_profile_id: "learner-a",
		},
		cardPacks: [
			{
				id: "pack-a",
				name: "Pack A",
				type: "pinyin-hanzi",
				owner_user_id: "learner-a",
				status: "active",
				created_at: timestamp,
				updated_at: null,
			},
			{
				id: "pack-b",
				name: "Pack B",
				type: "basic",
				owner_user_id: "learner-b",
				status: "active",
				created_at: timestamp,
				updated_at: null,
			},
		],
		cards: [
			{
				id: "card-a",
				card_pack_id: "pack-a",
				owner_user_id: "learner-a",
				prompt: "ni hao",
				answer: "你好",
				status: "active",
				created_at: timestamp,
				updated_at: null,
			},
			{
				id: "card-b",
				card_pack_id: "pack-b",
				owner_user_id: "learner-b",
				prompt: "front",
				answer: "back",
				status: "active",
				created_at: timestamp,
				updated_at: null,
			},
		],
		schedulingProfiles: [
			{
				id: "schedule-profile-a",
				owner_user_id: "learner-a",
				algorithm_key: "sm2",
				parameters: { request_retention: 0.9 },
				version: 1,
				created_at: timestamp,
			},
		],
		schedulingStates: [
			{
				id: "schedule-state-a",
				owner_user_id: "learner-a",
				learner_profile_id: "learner-a",
				card_id: "card-a",
				profile_id: "schedule-profile-a",
				due_at: timestamp,
				state: { interval_days: 3 },
				last_reviewed_at: timestamp,
				last_event_id: "review-a",
				created_at: timestamp,
			},
		],
		reviewEvents: [
			{
				id: "review-a",
				card_id: "card-a",
				owner_user_id: "learner-a",
				grade: 3,
				time_ms: 1200,
				raw_payload: { source: "test" },
				reviewed_at: timestamp,
				created_at: timestamp,
			},
		],
		cardMasteryStates: [
			{
				id: "mastery-a",
				owner_user_id: "learner-a",
				card_id: "card-a",
				mastery_score: 0.6,
				mastery_state: "learning",
				easy_streak: 1,
				recent_outcomes: [true],
				created_at: timestamp,
				updated_at: timestamp,
			},
		],
	};
}

function createMemoryStorage(): Pick<Storage, "getItem" | "setItem"> {
	const values = new Map<string, string>();
	return {
		getItem: vi.fn((key: string) => values.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			values.set(key, value);
		}),
	};
}

function createThrowingStorage(): Pick<Storage, "getItem" | "setItem"> {
	return {
		getItem: vi.fn(() => {
			throw new Error("localStorage unavailable");
		}),
		setItem: vi.fn(() => {
			throw new Error("localStorage unavailable");
		}),
	};
}

function createCloudClient(): ApiClient {
	return {
		put: vi.fn(),
	} as unknown as ApiClient;
}

beforeEach(() => {
	saveManyCloudProfilesMock.mockResolvedValue(undefined);
	vi.stubGlobal("window", {
		localStorage: createMemoryStorage(),
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	saveManyCloudProfilesMock.mockReset();
});

describe("createImportPlan", () => {
	it("reuses the same cloud ids for the same account and source", () => {
		const firstPlan = createImportPlan(createSource(), "account-1", timestamp);
		const secondPlan = createImportPlan(createSource(), "account-1", timestamp);

		expect([...secondPlan.profileIdMap.entries()]).toEqual([
			...firstPlan.profileIdMap.entries(),
		]);
		expect([...secondPlan.cardPackIdMap.entries()]).toEqual([
			...firstPlan.cardPackIdMap.entries(),
		]);
		expect([...secondPlan.cardIdMap.entries()]).toEqual([
			...firstPlan.cardIdMap.entries(),
		]);
		expect(secondPlan.profiles.map((profile) => profile.id)).toEqual(
			firstPlan.profiles.map((profile) => profile.id),
		);
		expect(secondPlan.cards.map((card) => card.id)).toEqual(
			firstPlan.cards.map((card) => card.id),
		);
	});

	it("creates unique cloud ids for many legacy local ids", () => {
		const source = createSource();
		const baseCard = source.cards[0];
		source.cards = Array.from({ length: 2500 }, (_, index) => ({
			...baseCard,
			id: `legacy/card:${index}:你好/${index}`,
			prompt: `prompt ${index}`,
			answer: `answer ${index}`,
		}));
		source.reviewEvents = [];
		source.schedulingStates = [];
		source.cardMasteryStates = [];

		const plan = createImportPlan(source, "account-1", timestamp);
		const cardIds = plan.cards.map((card) => card.id);

		expect(new Set(cardIds).size).toBe(cardIds.length);
		expect(cardIds).toHaveLength(2500);
		expect(cardIds).toEqual(
			expect.arrayContaining([
				expect.stringContaining("legacy%2Fcard%3A0%3A%E4%BD%A0%E5%A5%BD%2F0"),
			]),
		);
	});

	it("rejects duplicate generated ids in the same target collection", () => {
		const source = createSource();
		source.cards = [
			source.cards[0],
			{
				...source.cards[0],
				prompt: "duplicate prompt",
				answer: "duplicate answer",
			},
		];

		expect(() => createImportPlan(source, "account-1", timestamp)).toThrow(
			"Duplicate import document id for card",
		);
	});

	it("creates new cloud profiles and remaps normal entity ownership", () => {
		const plan = createImportPlan(
			createSource(),
			"account-1",
			"2026-02-01T00:00:00.000Z",
		);

		const mappedLearnerA = plan.profileIdMap.get("learner-a");
		const mappedLearnerB = plan.profileIdMap.get("learner-b");

		expect(mappedLearnerA).toBeTruthy();
		expect(mappedLearnerA).not.toBe("learner-a");
		expect(mappedLearnerB).toBeTruthy();
		expect(plan.profiles).toHaveLength(2);
		expect(plan.profiles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: mappedLearnerA,
					account_user_id: "account-1",
					nickname: "learner-a",
					import_metadata: expect.objectContaining({
						imported_from: "local_legacy",
						source_id: "learner-a",
					}),
				}),
			]),
		);

		expect(plan.cardPacks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: plan.cardPackIdMap.get("pack-a"),
					account_user_id: "account-1",
					owner_user_id: mappedLearnerA,
					profile_id: mappedLearnerA,
				}),
				expect.objectContaining({
					id: plan.cardPackIdMap.get("pack-b"),
					account_user_id: "account-1",
					owner_user_id: mappedLearnerB,
					profile_id: mappedLearnerB,
				}),
			]),
		);

		expect(plan.cards[0]).toMatchObject({
			id: plan.cardIdMap.get("card-a"),
			card_pack_id: plan.cardPackIdMap.get("pack-a"),
			account_user_id: "account-1",
			owner_user_id: mappedLearnerA,
			profile_id: mappedLearnerA,
		});
		expect(plan.reviewEvents[0]).toMatchObject({
			id: plan.reviewEventIdMap.get("review-a"),
			card_id: plan.cardIdMap.get("card-a"),
			account_user_id: "account-1",
			owner_user_id: mappedLearnerA,
			profile_id: mappedLearnerA,
		});
		expect(plan.cardMasteryStates[0]).toMatchObject({
			card_id: plan.cardIdMap.get("card-a"),
			account_user_id: "account-1",
			owner_user_id: mappedLearnerA,
			profile_id: mappedLearnerA,
		});
	});

	it("keeps scheduling state learner_profile_id separate from scheduling profile_id", () => {
		const plan = createImportPlan(createSource(), "account-1", timestamp);
		const mappedLearnerA = plan.profileIdMap.get("learner-a");
		const mappedSchedulingProfile = plan.schedulingProfileIdMap.get(
			"schedule-profile-a",
		);

		expect(mappedLearnerA).toBeTruthy();
		expect(mappedSchedulingProfile).toBeTruthy();
		expect(mappedSchedulingProfile).not.toBe(mappedLearnerA);

		expect(plan.schedulingProfiles[0]).toMatchObject({
			id: mappedSchedulingProfile,
			account_user_id: "account-1",
			owner_user_id: mappedLearnerA,
			profile_id: mappedLearnerA,
		});
		expect(plan.schedulingStates[0]).toMatchObject({
			card_id: plan.cardIdMap.get("card-a"),
			account_user_id: "account-1",
			owner_user_id: mappedLearnerA,
			learner_profile_id: mappedLearnerA,
			profile_id: mappedSchedulingProfile,
			last_event_id: plan.reviewEventIdMap.get("review-a"),
		});
	});
});

describe("writeImportPlan", () => {
	it("writes a completion marker and skips a repeated import of the same source", async () => {
		const firstPlan = createImportPlan(createSource(), "account-1", timestamp);
		const firstCloudClient = createCloudClient();

		const firstSummary = await writeImportPlan(firstPlan, firstCloudClient);

		expect(firstSummary.status).toBe("imported");
		expect(firstSummary.profiles).toBe(2);
		expect(saveManyCloudProfilesMock).toHaveBeenCalledWith(firstPlan.profiles);
		expect(saveManyCloudProfilesMock).toHaveBeenCalledTimes(1);
		expect(firstCloudClient.put).toHaveBeenCalledTimes(8);

		saveManyCloudProfilesMock.mockClear();
		const secondPlan = createImportPlan(createSource(), "account-1", timestamp);
		const secondCloudClient = createCloudClient();

		const secondSummary = await writeImportPlan(secondPlan, secondCloudClient);

		expect(secondSummary.status).toBe("already_imported");
		expect(secondSummary.sourceFingerprint).toBe(firstSummary.sourceFingerprint);
		expect(secondSummary.profiles).toBe(2);
		expect(saveManyCloudProfilesMock).not.toHaveBeenCalled();
		expect(secondCloudClient.put).not.toHaveBeenCalled();
	});

	it("retries a partial import with the same cloud document ids", async () => {
		const firstPlan = createImportPlan(createSource(), "account-1", timestamp);
		const firstCloudClient = createCloudClient();
		vi.mocked(firstCloudClient.put).mockRejectedValueOnce(
			new Error("first write failed"),
		);

		await expect(writeImportPlan(firstPlan, firstCloudClient)).rejects.toThrow(
			"first write failed",
		);

		expect(saveManyCloudProfilesMock).toHaveBeenCalledWith(firstPlan.profiles);
		expect(saveManyCloudProfilesMock).toHaveBeenCalledTimes(1);
		expect(firstCloudClient.put).toHaveBeenCalledTimes(1);

		saveManyCloudProfilesMock.mockClear();
		const secondPlan = createImportPlan(createSource(), "account-1", timestamp);
		const secondCloudClient = createCloudClient();

		const retrySummary = await writeImportPlan(secondPlan, secondCloudClient);

		expect(retrySummary.status).toBe("imported");
		expect(secondPlan.profileIdMap).toEqual(firstPlan.profileIdMap);
		expect(secondPlan.cardPackIdMap).toEqual(firstPlan.cardPackIdMap);
		expect(secondPlan.cardIdMap).toEqual(firstPlan.cardIdMap);
		expect(saveManyCloudProfilesMock).toHaveBeenCalledWith(firstPlan.profiles);
		expect(secondCloudClient.put).toHaveBeenCalledWith(
			"card_pack",
			firstPlan.cardPacks[0],
		);
	});

	it("does not crash when marker storage is unavailable", async () => {
		vi.stubGlobal("window", {
			localStorage: createThrowingStorage(),
		});
		const plan = createImportPlan(createSource(), "account-1", timestamp);
		const cloudClient = createCloudClient();

		expect(
			getCompletedLocalDataImportMarker(
				plan.accountUserId,
				plan.sourceFingerprint,
			),
		).toBeNull();

		const summary = await writeImportPlan(plan, cloudClient);

		expect(summary.status).toBe("imported");
		expect(saveManyCloudProfilesMock).toHaveBeenCalledWith(plan.profiles);
		expect(saveManyCloudProfilesMock).toHaveBeenCalledTimes(1);
		expect(cloudClient.put).toHaveBeenCalledTimes(8);
	});
});
