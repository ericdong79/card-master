import { describe, expect, it } from "vitest";
import { normalizeCardMasteryState } from "./card-mastery-state";

describe("normalizeCardMasteryState", () => {
	it("normalizes legacy malformed values", () => {
		const normalized = normalizeCardMasteryState({
			id: "m1",
			owner_user_id: "u1",
			card_id: "c1",
			mastery_score: 166,
			mastery_state: "legacy" as never,
			easy_streak: -4,
			recent_outcomes: [1, 0, "x"] as never,
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
		});

		expect(normalized.mastery_score).toBe(100);
		expect(normalized.mastery_state).toBe("unseen");
		expect(normalized.easy_streak).toBe(0);
		expect(normalized.recent_outcomes).toEqual([true, false, true]);
	});

	it("keeps valid values intact", () => {
		const normalized = normalizeCardMasteryState({
			id: "m1",
			owner_user_id: "u1",
			card_id: "c1",
			mastery_score: 73,
			mastery_state: "reviewing",
			easy_streak: 2,
			recent_outcomes: [true, false],
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
		});

		expect(normalized.mastery_score).toBe(73);
		expect(normalized.mastery_state).toBe("reviewing");
		expect(normalized.easy_streak).toBe(2);
		expect(normalized.recent_outcomes).toEqual([true, false]);
	});
});
