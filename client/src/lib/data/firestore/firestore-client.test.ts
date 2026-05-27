import { describe, expect, it } from "vitest";
import {
	FIRESTORE_IN_FILTER_LIMIT,
	chunkFirestoreInValues,
} from "./firestore-client";

describe("chunkFirestoreInValues", () => {
	it("deduplicates ids and chunks them at the Firestore in-filter limit", () => {
		const ids = Array.from({ length: 23 }, (_, index) => `card-${index}`);

		const chunks = chunkFirestoreInValues([...ids, "card-1", ""]);

		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toHaveLength(FIRESTORE_IN_FILTER_LIMIT);
		expect(chunks[1]).toHaveLength(FIRESTORE_IN_FILTER_LIMIT);
		expect(chunks[2]).toEqual(["card-20", "card-21", "card-22"]);
		expect(chunks.flat()).toEqual(ids);
	});
});
