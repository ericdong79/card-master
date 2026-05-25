import { describe, expect, it } from "vitest";

import type { StoreValue } from "@/lib/api/client";

import { createRepositoryTestDb } from "./repository-test-utils";

describe("createRepositoryTestDb", () => {
	it("clones initial store arrays", () => {
		const cardPacks = [{ id: "pack-1" }] as StoreValue<"card_pack">[];

		const db = createRepositoryTestDb({ card_pack: cardPacks });

		expect(db.card_pack).toEqual(cardPacks);
		expect(db.card_pack).not.toBe(cardPacks);
	});
});
