import { describe, expect, it } from "vitest";

import {
	ImportPayloadValidationError,
	parseImportPayload,
} from "./import-payload";

const timestamp = "2026-01-01T00:00:00.000Z";

const minimalValidPayload = () => ({
	format: "card-master-export" as const,
	version: 1 as const,
	exported_at: timestamp,
	include_review_state: false,
	packs: [],
	cards: [],
});

describe("parseImportPayload", () => {
	it("accepts a minimal valid payload", () => {
		const parsed = parseImportPayload(minimalValidPayload());
		expect(parsed.format).toBe("card-master-export");
		expect(parsed.version).toBe(1);
	});

	it("accepts a payload with cards and packs", () => {
		const payload = {
			...minimalValidPayload(),
			packs: [
				{
					id: "pack-1",
					name: "Pack 1",
					type: "basic" as const,
					owner_user_id: "owner-1",
					account_user_id: "acct-1",
					profile_id: "owner-1",
					status: "active" as const,
					created_at: timestamp,
					updated_at: null,
				},
			],
			cards: [
				{
					id: "card-1",
					card_pack_id: "pack-1",
					owner_user_id: "owner-1",
					account_user_id: "acct-1",
					profile_id: "owner-1",
					prompt: "q",
					answer: "a",
					status: "active" as const,
					created_at: timestamp,
					updated_at: null,
				},
			],
		};
		expect(() => parseImportPayload(payload)).not.toThrow();
	});

	it("rejects with specific path when a required envelope field is missing", () => {
		const broken: Record<string, unknown> = {
			...minimalValidPayload(),
		};
		delete broken.version;

		try {
			parseImportPayload(broken);
			expect.fail("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(ImportPayloadValidationError);
			const err = e as ImportPayloadValidationError;
			expect(err.message).toMatch(/version/);
		}
	});

	it("rejects unknown fields via strict() on the import payload", () => {
		const payload = {
			...minimalValidPayload(),
			some_extra_field: "should not be here",
		};

		try {
			parseImportPayload(payload);
			expect.fail("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(ImportPayloadValidationError);
		}
	});

	it("collects all malformed card items into one error", () => {
		const payload = {
			...minimalValidPayload(),
			packs: [
				{
					id: "pack-1",
					name: "Pack 1",
					owner_user_id: "owner-1",
					status: "active" as const,
					created_at: timestamp,
					updated_at: null,
				},
			],
			cards: [
				// Card 0 - missing answer
				{
					id: "card-bad-0",
					card_pack_id: "pack-1",
					owner_user_id: "owner-1",
					prompt: "q",
					status: "active",
					created_at: timestamp,
					updated_at: null,
				},
				// Card 1 - wrong type on status
				{
					id: "card-bad-1",
					card_pack_id: "pack-1",
					owner_user_id: "owner-1",
					prompt: "q",
					answer: "a",
					status: "made-up-status",
					created_at: timestamp,
					updated_at: null,
				},
			],
		};

		try {
			parseImportPayload(payload);
			expect.fail("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(ImportPayloadValidationError);
			const err = e as ImportPayloadValidationError;
			// Should reference both failing card indices.
			const paths = err.issues.map((issue) => issue.path.join("."));
			expect(paths.some((p) => p.startsWith("cards.0"))).toBe(true);
			expect(paths.some((p) => p.startsWith("cards.1"))).toBe(true);
		}
	});

	it("collects per-item issues across packs, cards, and review_state", () => {
		const payload = {
			...minimalValidPayload(),
			include_review_state: true,
			packs: [{ totally: "wrong" }],
			cards: [{ also: "wrong" }],
			review_state: {
				scheduling_profiles: [{ broken: true }],
				scheduling_states: [{ broken: true }],
				review_events: [{ broken: true }],
			},
		};

		try {
			parseImportPayload(payload);
			expect.fail("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(ImportPayloadValidationError);
			const err = e as ImportPayloadValidationError;
			const paths = err.issues.map((issue) => issue.path.join("."));
			expect(paths.some((p) => p.startsWith("packs.0"))).toBe(true);
			expect(paths.some((p) => p.startsWith("cards.0"))).toBe(true);
			expect(
				paths.some((p) =>
					p.startsWith("review_state.scheduling_profiles.0"),
				),
			).toBe(true);
		}
	});
});
