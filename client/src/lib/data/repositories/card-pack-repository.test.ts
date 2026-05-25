import { describe, expect, it } from "vitest";

import type { Card } from "@/lib/api/entities/card";
import type { CardMasteryState } from "@/lib/api/entities/card-mastery-state";
import type { CardPack } from "@/lib/api/entities/card-pack";
import type { CardSchedulingState } from "@/lib/api/entities/card-scheduling-state";
import type { ReviewEvent } from "@/lib/api/entities/review-event";

import { createCardPackRepository } from "./card-pack-repository";
import { createRepositoryTestDb } from "./repository-test-utils";

const accountUserId = "account-1";
const profileId = "profile-1";
const timestamp = "2026-01-02T00:00:00.000Z";

function pack(id: string): CardPack {
	return {
		id,
		name: id,
		type: "pinyin-hanzi",
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
		status: "active",
		created_at: timestamp,
		updated_at: null,
	};
}

function card(id: string, cardPackId: string): Card {
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
		created_at: timestamp,
		updated_at: null,
	};
}

function masteryState(id: string, cardId: string): CardMasteryState {
	return {
		id,
		card_id: cardId,
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
		mastery_score: 0.5,
		mastery_state: "learning",
		easy_streak: 1,
		recent_outcomes: [true],
		created_at: timestamp,
		updated_at: timestamp,
	};
}

function schedulingState(id: string, cardId: string): CardSchedulingState {
	return {
		id,
		card_id: cardId,
		account_user_id: accountUserId,
		learner_profile_id: profileId,
		owner_user_id: profileId,
		profile_id: "sm2-profile",
		due_at: timestamp,
		state: {},
		last_reviewed_at: timestamp,
		last_event_id: null,
		created_at: timestamp,
	};
}

function reviewEvent(id: string, cardId: string): ReviewEvent {
	return {
		id,
		card_id: cardId,
		account_user_id: accountUserId,
		profile_id: profileId,
		owner_user_id: profileId,
		grade: 3,
		time_ms: 1000,
		raw_payload: null,
		reviewed_at: timestamp,
		created_at: timestamp,
	};
}

describe("createCardPackRepository", () => {
	it("deletes a pack and all card-owned review data", async () => {
		const db = createRepositoryTestDb({
			card_pack: [pack("pack-1"), pack("pack-2")],
			card: [card("card-1", "pack-1"), card("card-2", "pack-1"), card("card-3", "pack-2")],
			card_mastery_state: [
				masteryState("mastery-1", "card-1"),
				masteryState("mastery-2", "card-2"),
				masteryState("mastery-3", "card-3"),
			],
			card_scheduling_state: [
				schedulingState("schedule-1", "card-1"),
				schedulingState("schedule-2", "card-2"),
				schedulingState("schedule-3", "card-3"),
				{
					...schedulingState("other-learner-schedule", "card-2"),
					learner_profile_id: "profile-2",
					owner_user_id: "profile-2",
				},
			],
			review_event: [
				reviewEvent("event-1", "card-1"),
				reviewEvent("event-2", "card-2"),
				reviewEvent("event-3", "card-3"),
			],
		});
		const repository = createCardPackRepository({ db });

		await repository.deletePackWithData({
			accountUserId,
			profileId,
			cardPackId: "pack-1",
		});

		expect(db.card_pack.map((item) => item.id)).toEqual(["pack-2"]);
		expect(db.card.map((item) => item.id)).toEqual(["card-3"]);
		expect(db.card_mastery_state.map((item) => item.id)).toEqual(["mastery-3"]);
		expect(db.card_scheduling_state.map((item) => item.id)).toEqual([
			"schedule-3",
			"other-learner-schedule",
		]);
		expect(db.review_event.map((item) => item.id)).toEqual(["event-3"]);
	});

	it("cleans remaining cards and review data when retrying after the pack is already missing", async () => {
		const db = createRepositoryTestDb({
			card_pack: [pack("pack-2")],
			card: [card("card-1", "pack-1"), card("card-2", "pack-2")],
			card_mastery_state: [
				masteryState("mastery-1", "card-1"),
				masteryState("mastery-2", "card-2"),
			],
			card_scheduling_state: [
				schedulingState("schedule-1", "card-1"),
				schedulingState("schedule-2", "card-2"),
			],
			review_event: [
				reviewEvent("event-1", "card-1"),
				reviewEvent("event-2", "card-2"),
			],
		});
		const repository = createCardPackRepository({ db });

		await repository.deletePackWithData({
			accountUserId,
			profileId,
			cardPackId: "pack-1",
		});

		expect(db.card_pack.map((item) => item.id)).toEqual(["pack-2"]);
		expect(db.card.map((item) => item.id)).toEqual(["card-2"]);
		expect(db.card_mastery_state.map((item) => item.id)).toEqual(["mastery-2"]);
		expect(db.card_scheduling_state.map((item) => item.id)).toEqual([
			"schedule-2",
		]);
		expect(db.review_event.map((item) => item.id)).toEqual(["event-2"]);
	});
});
