import { describe, expect, it, vi } from "vitest";
import {
	clearQueryCache,
	createProfileCacheKey,
	getCachedQuery,
	setCachedQuery,
} from "./query-cache";
import { chunkFirestoreInValues } from "./id-chunks";

describe("query-cache", () => {
	it("stores values by profile-scoped cache key until ttl expires", () => {
		vi.useFakeTimers();
		clearQueryCache();
		const key = createProfileCacheKey("account-1", "profile-1", "dashboard");

		setCachedQuery(key, { packs: 1 }, 1000);
		expect(getCachedQuery<{ packs: number }>(key)).toEqual({ packs: 1 });

		vi.advanceTimersByTime(1001);
		expect(getCachedQuery(key)).toBeNull();
		vi.useRealTimers();
	});

	it("clears one profile scope without clearing another profile", () => {
		clearQueryCache();
		const first = createProfileCacheKey("account-1", "profile-1", "cards");
		const second = createProfileCacheKey("account-1", "profile-2", "cards");

		setCachedQuery(first, ["a"], 1000);
		setCachedQuery(second, ["b"], 1000);
		clearQueryCache({ accountUserId: "account-1", profileId: "profile-1" });

		expect(getCachedQuery(first)).toBeNull();
		expect(getCachedQuery<string[]>(second)).toEqual(["b"]);
	});
});

describe("chunkFirestoreInValues", () => {
	it("deduplicates ids, removes empty values, and chunks by 10", () => {
		const values = Array.from({ length: 23 }, (_, index) => `card-${index}`);

		const chunks = chunkFirestoreInValues([...values, "card-1", ""]);

		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toHaveLength(10);
		expect(chunks[1]).toHaveLength(10);
		expect(chunks[2]).toEqual(["card-20", "card-21", "card-22"]);
		expect(chunks.flat()).toEqual(values);
	});
});
