import type { ComponentType } from "react";
import seedImg from "@/assets/mastery-theme/story/unseen-seed.svg";
import sproutImg from "@/assets/mastery-theme/story/learning-sprout.svg";
import stemImg from "@/assets/mastery-theme/story/graduated-stem.svg";
import tallerImg from "@/assets/mastery-theme/story/reviewing-taller.svg";
import treeImg from "@/assets/mastery-theme/story/mastered-tree.svg";
import type {
	MasteryDeltaFeedbackInput,
	MasteryPresentationContext,
	MasteryPresentationPlugin,
	MasteryState,
} from "../../types";

const imageIcon = (src: string, altKey: string): ComponentType<{ className?: string }> =>
	({ className }) => (
		<img
			src={src}
			alt={altKey}
			className={className ?? "h-5 w-5 rounded-sm object-cover"}
			loading="lazy"
		/>
	);

function getStateMeta(state: MasteryState, ctx: MasteryPresentationContext) {
	switch (state) {
		case "unseen":
			return {
				label: ctx.t("mastery.storyImage.states.unseen"),
				IconComponent: imageIcon(seedImg, ctx.t("mastery.storyImage.states.unseen")),
				colorClassName: "text-stone-700",
			};
		case "learning":
			return {
				label: ctx.t("mastery.storyImage.states.learning"),
				IconComponent: imageIcon(sproutImg, ctx.t("mastery.storyImage.states.learning")),
				colorClassName: "text-lime-700",
			};
		case "graduated":
			return {
				label: ctx.t("mastery.storyImage.states.graduated"),
				IconComponent: imageIcon(stemImg, ctx.t("mastery.storyImage.states.graduated")),
				colorClassName: "text-green-700",
			};
		case "reviewing":
			return {
				label: ctx.t("mastery.storyImage.states.reviewing"),
				IconComponent: imageIcon(tallerImg, ctx.t("mastery.storyImage.states.reviewing")),
				colorClassName: "text-emerald-700",
			};
		case "mastered":
			return {
				label: ctx.t("mastery.storyImage.states.mastered"),
				IconComponent: imageIcon(treeImg, ctx.t("mastery.storyImage.states.mastered")),
				colorClassName: "text-emerald-800",
			};
	}
}

export const storybookImageMasteryPlugin: MasteryPresentationPlugin = {
	id: "storybook-image",
	name: "Storybook Image",
	nameKey: "mastery.themes.storybookImage",
	getStateMeta,
	getProgressText: (score, ctx) => ctx.t("mastery.progress.growth", { score }),
	getDeltaFeedback: (input: MasteryDeltaFeedbackInput, ctx: MasteryPresentationContext) => {
		if (input.isFirstLearn) {
			return {
				title: ctx.t("mastery.storyImage.feedback.first"),
				subtitle: ctx.t("mastery.storyImage.feedback.delta", {
					delta: `+${Math.max(0, input.transition.delta)}%`,
				}),
				animationKey: "story-image-pop",
			};
		}

		if (input.transition.delta < 0) {
			return {
				title: ctx.t("mastery.storyImage.feedback.down"),
				subtitle: ctx.t("mastery.storyImage.feedback.delta", {
					delta: `${input.transition.delta}%`,
				}),
				animationKey: "story-image-down",
			};
		}

		return {
			title: ctx.t("mastery.storyImage.feedback.up"),
			subtitle: ctx.t("mastery.storyImage.feedback.delta", {
				delta: `+${input.transition.delta}%`,
			}),
			animationKey: "story-image-up",
		};
	},
};
