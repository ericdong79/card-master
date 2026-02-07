import { getGradePreviews } from "@/lib/scheduling/sm2/preview";
import type { ReviewGrade } from "@/lib/scheduling/types";
import type { Sm2Parameters, Sm2State } from "@/lib/scheduling/types/sm2-types";

export type SimpleReviewResult = "forgot" | "remembered";

export type ReviewMode = "simple" | "sm2";

type BaseButtonConfig = {
	label: string;
	icon: string;
	subLabel?: string;
};

export type SimpleButtonConfig = BaseButtonConfig & {
	result: SimpleReviewResult;
};

export type Sm2ButtonConfig = BaseButtonConfig & {
	grade: ReviewGrade;
};

export const defaultSimpleButtons: SimpleButtonConfig[] = [
	{
		result: "forgot",
		label: "Forgot",
		icon: "😕",
		subLabel: "Try Again",
	},
	{
		result: "remembered",
		label: "Remembered",
		icon: "✅",
		subLabel: "Next Card",
	},
];

const defaultSm2ButtonMeta: Omit<Sm2ButtonConfig, "subLabel">[] = [
	{ grade: "again", label: "Forgot", icon: "❌" },
	{ grade: "hard", label: "Partially Recall", icon: "🤔" },
	{ grade: "good", label: "Recalled with effort", icon: "🤭" },
	{ grade: "easy", label: "Easily Recalled", icon: "👑" },
];

export const defaultSm2Buttons: Sm2ButtonConfig[] = [...defaultSm2ButtonMeta];

export function createDefaultSm2Buttons(
	state: Sm2State | null,
	params: Sm2Parameters,
	now: Date = new Date(),
): Sm2ButtonConfig[] {
	const previews = getGradePreviews(state, params, now);
	return defaultSm2ButtonMeta.map((button) => ({
		...button,
		subLabel: previews[button.grade],
	}));
}
