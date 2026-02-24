import type { ComponentType, ReactNode } from "react";

export type MasteryState = "unseen" | "learning" | "graduated" | "reviewing" | "mastered";

export type MasteryTransition = {
	beforeScore: number;
	afterScore: number;
	beforeState: MasteryState;
	afterState: MasteryState;
	delta: number;
};

export type MasteryThemeFeedback = {
	title: string;
	subtitle?: string;
	animationKey?: string;
	soundKey?: string;
};

export type MasteryThemeStateMeta = {
	label: string;
	icon?: ReactNode;
	IconComponent?: ComponentType<{ className?: string }>;
	colorClassName?: string;
	ariaLabel?: string;
};

export type MasteryPresentationContext = {
	t: (key: string, options?: Record<string, unknown>) => string;
};

export type MasteryDeltaFeedbackInput = {
	transition: MasteryTransition;
	rating: "again" | "hard" | "good" | "easy";
	isFirstLearn: boolean;
};

export interface MasteryPresentationPlugin {
	id: string;
	name: string;
	nameKey: string;
	getStateMeta: (state: MasteryState, ctx: MasteryPresentationContext) => MasteryThemeStateMeta;
	getProgressText: (score: number, ctx: MasteryPresentationContext) => string;
	getDeltaFeedback: (
		input: MasteryDeltaFeedbackInput,
		ctx: MasteryPresentationContext,
	) => MasteryThemeFeedback;
}
