import type {
	MasteryDeltaFeedbackInput,
	MasteryPresentationContext,
	MasteryPresentationPlugin,
	MasteryState,
} from "../../types";

function stateMeta(state: MasteryState, ctx: MasteryPresentationContext) {
	switch (state) {
		case "unseen":
			return { label: ctx.t("mastery.states.unseen"), icon: "○", colorClassName: "text-muted-foreground" };
		case "learning":
			return { label: ctx.t("mastery.states.learning"), icon: "◔", colorClassName: "text-amber-600" };
		case "graduated":
			return { label: ctx.t("mastery.states.graduated"), icon: "◑", colorClassName: "text-blue-600" };
		case "reviewing":
			return { label: ctx.t("mastery.states.reviewing"), icon: "◕", colorClassName: "text-indigo-600" };
		case "mastered":
			return { label: ctx.t("mastery.states.mastered"), icon: "●", colorClassName: "text-emerald-600" };
	}
}

function deltaPrefix(delta: number): string {
	if (delta > 0) return `+${delta}%`;
	if (delta < 0) return `${delta}%`;
	return "0%";
}

function buildTitle(input: MasteryDeltaFeedbackInput, ctx: MasteryPresentationContext): string {
	if (input.transition.beforeState !== input.transition.afterState) {
		const next = stateMeta(input.transition.afterState, ctx);
		return ctx.t("mastery.feedback.stateChanged", { state: next.label });
	}
	if (input.transition.delta > 0) return ctx.t("mastery.feedback.improved");
	if (input.transition.delta < 0) return ctx.t("mastery.feedback.needReview");
	return ctx.t("mastery.feedback.noChange");
}

export const defaultAcademicMasteryPlugin: MasteryPresentationPlugin = {
	id: "default-academic",
	name: "Default Academic",
	nameKey: "mastery.themes.defaultAcademic",
	getStateMeta: stateMeta,
	getProgressText: (score, ctx) => ctx.t("mastery.progress.mastery", { score }),
	getDeltaFeedback: (input, ctx) => ({
		title: buildTitle(input, ctx),
		subtitle: ctx.t("mastery.feedback.delta", { delta: deltaPrefix(input.transition.delta) }),
		animationKey: input.transition.delta >= 0 ? "mastery-rise" : "mastery-fall",
	}),
};
