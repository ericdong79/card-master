import { describe, expect, it } from "vitest";
import type { ApiClient, StoreName, StoreValue } from "@/lib/data/store-client";
import type { Card } from "./entities/card";
import type { CardMasteryState } from "./entities/card-mastery-state";
import type { CardPack } from "./entities/card-pack";
import type { CardSchedulingState } from "./entities/card-scheduling-state";
import type { ReviewEvent } from "./entities/review-event";
import type { SchedulingProfile } from "./entities/scheduling-profile";
import {
	buildCardMasterExport,
	importCardMasterData,
	parseCardMasterExport,
} from "./import-export";

const timestamp = "2026-01-01T00:00:00.000Z";

type TestDb = {
	[S in StoreName]: StoreValue<S>[];
};

function createMemoryClient(initial?: Partial<TestDb>): {
	client: ApiClient;
	db: TestDb;
} {
	const db: TestDb = {
		card_pack: [],
		card: [],
		card_mastery_state: [],
		card_scheduling_state: [],
		scheduling_profile: [],
		review_event: [],
		...initial,
	};

	return {
		db,
		client: {
			list: async (store, options) => {
				const records = db[store] as StoreValue<typeof store>[];
				const filtered = options?.filter ? records.filter(options.filter) : records;
				return options?.sortBy ? [...filtered].sort(options.sortBy) : filtered;
			},
			get: async (store, id) =>
				(db[store] as StoreValue<typeof store>[]).find((record) => record.id === id) ??
				null,
			put: async (store, record) => {
				const records = db[store] as StoreValue<typeof store>[];
				const index = records.findIndex((item) => item.id === record.id);
				if (index >= 0) {
					records[index] = record;
				} else {
					records.push(record);
				}
				return record;
			},
			delete: async (store, id) => {
				const records = db[store] as StoreValue<typeof store>[];
				const index = records.findIndex((record) => record.id === id);
				if (index >= 0) records.splice(index, 1);
			},
		},
	};
}

describe("parseCardMasterExport backward compatibility", () => {
	it("accepts v1 payload without mastery states", () => {
		const payload = {
			format: "card-master-export",
			version: 1,
			exported_at: "2026-01-01T00:00:00.000Z",
			include_review_state: true,
			packs: [],
			cards: [],
			review_state: {
				scheduling_profiles: [],
				scheduling_states: [],
				review_events: [],
			},
		};

		expect(parseCardMasterExport(JSON.stringify(payload))).toMatchObject({
			format: "card-master-export",
			version: 1,
		});
	});

	it("accepts payload with optional mastery states", () => {
		const payload = {
			format: "card-master-export",
			version: 1,
			exported_at: "2026-01-01T00:00:00.000Z",
			include_review_state: true,
			packs: [],
			cards: [],
			review_state: {
				scheduling_profiles: [],
				scheduling_states: [],
				review_events: [],
				card_mastery_states: [],
			},
		};

		expect(parseCardMasterExport(JSON.stringify(payload))).toMatchObject({
			review_state: {
				card_mastery_states: [],
			},
		});
	});

	it("rejects malformed mastery field", () => {
		const payload = {
			format: "card-master-export",
			version: 1,
			exported_at: "2026-01-01T00:00:00.000Z",
			include_review_state: true,
			packs: [],
			cards: [],
			review_state: {
				scheduling_profiles: [],
				scheduling_states: [],
				review_events: [],
				card_mastery_states: {},
			},
		};

		expect(() => parseCardMasterExport(JSON.stringify(payload))).toThrow(
			/review_state\.card_mastery_states/,
		);
	});
});

describe("Card Master import/export cloud ownership", () => {
	it("exports only matching account and profile records", async () => {
		const matchingPack: CardPack = {
			id: "pack-1",
			name: "Pack 1",
			type: "basic",
			owner_user_id: "profile-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			status: "active",
			created_at: timestamp,
			updated_at: null,
		};
		const otherAccountPack: CardPack = {
			...matchingPack,
			id: "pack-2",
			owner_user_id: "profile-1",
			account_user_id: "account-2",
		};
		const matchingCard: Card = {
			id: "card-1",
			card_pack_id: "pack-1",
			owner_user_id: "profile-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			prompt: "q",
			answer: "a",
			status: "active",
			created_at: timestamp,
			updated_at: null,
		};
		const otherProfileCard: Card = {
			...matchingCard,
			id: "card-2",
			card_pack_id: "pack-1",
			owner_user_id: "profile-2",
			profile_id: "profile-2",
		};
		const matchingSchedulingProfile: SchedulingProfile = {
			id: "schedule-profile-1",
			owner_user_id: "profile-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			algorithm_key: "sm2",
			parameters: {},
			version: 1,
			created_at: timestamp,
		};
		const matchingSchedulingState: CardSchedulingState = {
			id: "schedule-state-1",
			owner_user_id: "profile-1",
			account_user_id: "account-1",
			learner_profile_id: "profile-1",
			card_id: "card-1",
			profile_id: "schedule-profile-1",
			due_at: timestamp,
			state: {},
			last_reviewed_at: timestamp,
			last_event_id: "event-1",
			created_at: timestamp,
		};
		const wrongLearnerState: CardSchedulingState = {
			...matchingSchedulingState,
			id: "schedule-state-2",
			learner_profile_id: "profile-2",
		};
		const matchingReviewEvent: ReviewEvent = {
			id: "event-1",
			owner_user_id: "profile-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			card_id: "card-1",
			grade: 3,
			time_ms: 100,
			raw_payload: null,
			reviewed_at: timestamp,
			created_at: timestamp,
		};
		const matchingMasteryState: CardMasteryState = {
			id: "mastery-1",
			owner_user_id: "profile-1",
			account_user_id: "account-1",
			profile_id: "profile-1",
			card_id: "card-1",
			mastery_score: 75,
			mastery_state: "reviewing",
			easy_streak: 1,
			recent_outcomes: [true],
			created_at: timestamp,
			updated_at: timestamp,
		};

		const { client } = createMemoryClient({
			card_pack: [matchingPack, otherAccountPack],
			card: [matchingCard, otherProfileCard],
			scheduling_profile: [matchingSchedulingProfile],
			card_scheduling_state: [matchingSchedulingState, wrongLearnerState],
			review_event: [matchingReviewEvent],
			card_mastery_state: [matchingMasteryState],
		});

		const payload = await buildCardMasterExport(
			client,
			"account-1",
			"profile-1",
			{
				cardPackIds: ["pack-1", "pack-2"],
				includeReviewState: true,
			},
		);

		expect(payload.packs.map((pack) => pack.id)).toEqual(["pack-1"]);
		expect(payload.cards.map((card) => card.id)).toEqual(["card-1"]);
		expect(payload.review_state?.scheduling_states.map((state) => state.id)).toEqual([
			"schedule-state-1",
		]);
		expect(payload.review_state?.review_events.map((event) => event.id)).toEqual([
			"event-1",
		]);
		expect(payload.review_state?.card_mastery_states?.map((state) => state.id)).toEqual([
			"mastery-1",
		]);
	});

	it("imports records with target account and profile ownership", async () => {
		const { client, db } = createMemoryClient();
		const payload = parseCardMasterExport(
			JSON.stringify({
				format: "card-master-export",
				version: 1,
				exported_at: timestamp,
				include_review_state: true,
				packs: [
					{
						id: "source-pack",
						name: "Imported",
						type: "basic",
						owner_user_id: "source-profile",
						account_user_id: "source-account",
						profile_id: "source-profile",
						status: "active",
						created_at: timestamp,
						updated_at: null,
					},
				],
				cards: [
					{
						id: "source-card",
						card_pack_id: "source-pack",
						owner_user_id: "source-profile",
						account_user_id: "source-account",
						profile_id: "source-profile",
						prompt: "q",
						answer: "a",
						status: "active",
						created_at: timestamp,
						updated_at: null,
					},
				],
				review_state: {
					scheduling_profiles: [
						{
							id: "source-schedule-profile",
							owner_user_id: "source-profile",
							account_user_id: "source-account",
							profile_id: "source-profile",
							algorithm_key: "sm2",
							parameters: {},
							version: 1,
							created_at: timestamp,
						},
					],
					scheduling_states: [
						{
							id: "source-schedule-state",
							owner_user_id: "source-profile",
							account_user_id: "source-account",
							learner_profile_id: "source-profile",
							card_id: "source-card",
							profile_id: "source-schedule-profile",
							due_at: timestamp,
							state: {},
							last_reviewed_at: timestamp,
							last_event_id: "source-event",
							created_at: timestamp,
						},
					],
					review_events: [
						{
							id: "source-event",
							owner_user_id: "source-profile",
							account_user_id: "source-account",
							profile_id: "source-profile",
							card_id: "source-card",
							grade: 3,
							time_ms: 100,
							raw_payload: null,
							reviewed_at: timestamp,
							created_at: timestamp,
						},
					],
					card_mastery_states: [
						{
							id: "source-mastery",
							owner_user_id: "source-profile",
							account_user_id: "source-account",
							profile_id: "source-profile",
							card_id: "source-card",
							mastery_score: 40,
							mastery_state: "learning",
							easy_streak: 0,
							recent_outcomes: [false],
							created_at: timestamp,
							updated_at: timestamp,
						},
					],
				},
			}),
		);

		await importCardMasterData(client, "target-account", "target-profile", payload, {
			importReviewState: true,
		});

		expect(db.card_pack[0]).toMatchObject({
			account_user_id: "target-account",
			profile_id: "target-profile",
			owner_user_id: "target-profile",
		});
		expect(db.card[0]).toMatchObject({
			account_user_id: "target-account",
			profile_id: "target-profile",
			owner_user_id: "target-profile",
			card_pack_id: db.card_pack[0].id,
		});
		expect(db.scheduling_profile[0]).toMatchObject({
			account_user_id: "target-account",
			profile_id: "target-profile",
			owner_user_id: "target-profile",
		});
		expect(db.review_event[0]).toMatchObject({
			account_user_id: "target-account",
			profile_id: "target-profile",
			owner_user_id: "target-profile",
			card_id: db.card[0].id,
		});
		expect(db.card_scheduling_state[0]).toMatchObject({
			account_user_id: "target-account",
			learner_profile_id: "target-profile",
			owner_user_id: "target-profile",
			card_id: db.card[0].id,
			profile_id: db.scheduling_profile[0].id,
			last_event_id: db.review_event[0].id,
		});
		expect(db.card_mastery_state[0]).toMatchObject({
			account_user_id: "target-account",
			profile_id: "target-profile",
			owner_user_id: "target-profile",
			card_id: db.card[0].id,
		});
	});
});
