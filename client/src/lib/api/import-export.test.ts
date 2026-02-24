import { describe, expect, it } from "vitest";
import { parseCardMasterExport } from "./import-export";

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
			"Invalid export file: malformed review_state.card_mastery_states.",
		);
	});
});
