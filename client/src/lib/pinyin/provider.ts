import { pinyin as toPinyin } from "pinyin-pro";

export interface PinyinResolverProvider {
	resolvePinyin(hanzi: string): Promise<string>;
}

export class PinyinResolutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PinyinResolutionError";
	}
}

class PinyinProResolverProvider implements PinyinResolverProvider {
	async resolvePinyin(hanzi: string): Promise<string> {
		const trimmed = hanzi.trim();
		if (!trimmed) {
			throw new PinyinResolutionError("Hanzi cannot be empty.");
		}

		const resolved = toPinyin(trimmed, { toneType: "symbol" }).trim();
		if (!resolved) {
			throw new PinyinResolutionError(`Unable to resolve pinyin for "${trimmed}".`);
		}

		return resolved.replace(/\s+/g, " ");
	}
}

let activeResolverProvider: PinyinResolverProvider = new PinyinProResolverProvider();

export function setPinyinResolverProvider(provider: PinyinResolverProvider) {
	activeResolverProvider = provider;
}

export function getPinyinResolverProvider(): PinyinResolverProvider {
	return activeResolverProvider;
}

export async function resolvePinyin(hanzi: string): Promise<string> {
	return activeResolverProvider.resolvePinyin(hanzi);
}
