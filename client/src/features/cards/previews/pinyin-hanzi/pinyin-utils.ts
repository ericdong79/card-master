const PINYIN_SYLLABLE_PATTERN =
	/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u00FC\u00DCvV]+[1-5]?/g;

export function splitPinyinSyllables(pinyin: string): string[] {
	return pinyin.match(PINYIN_SYLLABLE_PATTERN) ?? [];
}
