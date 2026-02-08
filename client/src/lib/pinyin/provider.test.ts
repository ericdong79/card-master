import { afterEach, describe, expect, it } from "vitest";

import {
	getPinyinResolverProvider,
	PinyinResolutionError,
	resolvePinyin,
	setPinyinResolverProvider,
	type PinyinResolverProvider,
} from "@/lib/pinyin/provider";

const defaultProvider = getPinyinResolverProvider();

afterEach(() => {
	setPinyinResolverProvider(defaultProvider);
});

describe("pinyin provider", () => {
	it("resolves hanzi to pinyin with tone marks", async () => {
		const result = await resolvePinyin("中国");
		expect(result).toBe("zhōng guó");
	});

	it("normalizes whitespace in resolved output", async () => {
		const result = await resolvePinyin("中国\n人");
		expect(result.includes("\n")).toBe(false);
		expect(result).toContain(" ");
	});

	it("throws PinyinResolutionError for empty input", async () => {
		await expect(resolvePinyin("   ")).rejects.toBeInstanceOf(PinyinResolutionError);
	});

	it("uses injected provider implementation", async () => {
		const mockProvider: PinyinResolverProvider = {
			resolvePinyin: async (hanzi) => `mock:${hanzi}`,
		};
		setPinyinResolverProvider(mockProvider);

		await expect(resolvePinyin("和谐")).resolves.toBe("mock:和谐");
	});
});

