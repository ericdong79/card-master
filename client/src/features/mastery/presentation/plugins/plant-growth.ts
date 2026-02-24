import type {
	MasteryDeltaFeedbackInput,
	MasteryPresentationContext,
	MasteryPresentationPlugin,
	MasteryState,
} from "../../types";

function stateMeta(state: MasteryState, ctx: MasteryPresentationContext) {
	switch (state) {
		case "unseen":
			return { label: ctx.t("mastery.plant.states.seed"), icon: "🌰", colorClassName: "text-stone-600" };
		case "learning":
			return { label: ctx.t("mastery.plant.states.sprout"), icon: "🌱", colorClassName: "text-lime-600" };
		case "graduated":
			return { label: ctx.t("mastery.plant.states.stem"), icon: "🪴", colorClassName: "text-green-600" };
		case "reviewing":
			return { label: ctx.t("mastery.plant.states.growing"), icon: "🌿", colorClassName: "text-emerald-600" };
		case "mastered":
			return { label: ctx.t("mastery.plant.states.tree"), icon: "🌳", colorClassName: "text-emerald-700" };
	}
}

export const plantGrowthMasteryPlugin: MasteryPresentationPlugin = {
	id: "plant-growth",
	name: "Plant Growth",
	nameKey: "mastery.themes.plantGrowth",
	getStateMeta: stateMeta,
	getProgressText: (score, ctx) => ctx.t("mastery.progress.growth", { score }),
	getDeltaFeedback: (input: MasteryDeltaFeedbackInput, ctx) => {
		const next = stateMeta(input.transition.afterState, ctx);
		if (input.isFirstLearn) {
			return {
				title: ctx.t("mastery.plant.feedback.firstLearn"),
				subtitle: ctx.t("mastery.plant.feedback.delta", {
					delta: `+${Math.max(input.transition.delta, 0)}%`,
				}),
				animationKey: "sprout-first-time",
				soundKey: "seed-pop",
			};
		}

		if (input.transition.delta < 0) {
			return {
				title: ctx.t("mastery.plant.feedback.decreased"),
				subtitle: ctx.t("mastery.plant.feedback.delta", {
					delta: `${input.transition.delta}%`,
				}),
				animationKey: "plant-wobble",
			};
		}

		return {
			title: ctx.t("mastery.plant.feedback.stage", { stage: next.label }),
			subtitle: ctx.t("mastery.plant.feedback.delta", { delta: `+${input.transition.delta}%` }),
			animationKey: input.transition.afterState === "mastered" ? "tree-bloom" : "plant-grow",
		};
	},
};
