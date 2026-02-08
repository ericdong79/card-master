import { getGradePreviews } from "@/lib/scheduling/sm2/preview";
import type { ReviewGrade } from "@/lib/scheduling/types";
import type { Sm2Parameters, Sm2State } from "@/lib/scheduling/types/sm2-types";
import i18n from "@/i18n";

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

export function getDefaultSimpleButtons(): SimpleButtonConfig[] {
	return [
		{
			result: "forgot",
			label: i18n.t("review.buttons.forgot"),
			icon: "😕",
			subLabel: i18n.t("review.buttons.tryAgain"),
		},
		{
			result: "remembered",
			label: i18n.t("review.buttons.remembered"),
			icon: "✅",
			subLabel: i18n.t("review.buttons.nextCard"),
		},
	];
}

function getDefaultSm2ButtonMeta(): Omit<Sm2ButtonConfig, "subLabel">[] {
	return [
		{ grade: "again", label: i18n.t("review.buttons.forgot"), icon: "❌" },
		{ grade: "hard", label: i18n.t("review.buttons.partiallyRecall"), icon: "🤔" },
		{
			grade: "good",
			label: i18n.t("review.buttons.recalledWithEffort"),
			icon: "🤭",
		},
		{ grade: "easy", label: i18n.t("review.buttons.easilyRecalled"), icon: "👑" },
	];
}

export function getDefaultSm2Buttons(): Sm2ButtonConfig[] {
	return [...getDefaultSm2ButtonMeta()];
}

// Backward-compatible exports used by stories.
export const defaultSimpleButtons: SimpleButtonConfig[] = getDefaultSimpleButtons();
export const defaultSm2Buttons: Sm2ButtonConfig[] = getDefaultSm2Buttons();

export function createDefaultSm2Buttons(
	state: Sm2State | null,
	params: Sm2Parameters,
	now: Date = new Date(),
): Sm2ButtonConfig[] {
	const previews = getGradePreviews(state, params, now);
	return getDefaultSm2ButtonMeta().map((button) => ({
		...button,
		// Session behavior re-queues "Again" shortly, so show a short effective delay.
		subLabel: button.grade === "again" ? "1m" : previews[button.grade],
	}));
}
