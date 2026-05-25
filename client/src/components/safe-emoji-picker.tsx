import { lazy, Suspense } from "react";
import type { Props as EmojiPickerProps } from "emoji-picker-react";

import { Spinner } from "@/components/ui/spinner";
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

	if (typeof window === "undefined") {
		return null;
	}

	return (
		<Suspense
			fallback={
				<div className="flex min-h-64 items-center justify-center">
					<Spinner />
				</div>
			}
		>
			<EmojiPicker {...props} hiddenEmojis={mergedHiddenEmojis} />
		</Suspense>
	);
}
