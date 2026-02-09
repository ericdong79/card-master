import { lazy, Suspense } from "react";
import type { Props as EmojiPickerProps } from "emoji-picker-react";

import { SAFE_EMOJI_HIDDEN_UNIFIED_IDS } from "@/lib/emoji/hidden-emojis";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

type SafeEmojiPickerProps = EmojiPickerProps;

export function SafeEmojiPicker({
	hiddenEmojis,
	...props
}: SafeEmojiPickerProps) {
	const mergedHiddenEmojis = hiddenEmojis
		? Array.from(new Set([...SAFE_EMOJI_HIDDEN_UNIFIED_IDS, ...hiddenEmojis]))
		: SAFE_EMOJI_HIDDEN_UNIFIED_IDS;

	return (
		<Suspense
			fallback={<div className="h-80 w-full animate-pulse rounded bg-muted" />}
		>
			<EmojiPicker {...props} hiddenEmojis={mergedHiddenEmojis} />
		</Suspense>
	);
}
