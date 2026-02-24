import { createElement, isValidElement, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { getMasteryPresentationPlugin } from "@/features/mastery";
import type { MasteryState } from "@/lib/api/entities/card-mastery-state";
import { cn } from "@/lib/utils";

type MasteryToastProps = {
	feedback: {
		transition: {
			beforeScore: number;
			afterScore: number;
			beforeState: MasteryState;
			afterState: MasteryState;
			delta: number;
		};
		rating: "again" | "hard" | "good" | "easy";
		isFirstLearn: boolean;
	};
	themeId?: string | null;
};

function renderIcon(icon: unknown, className?: string) {
	if (icon == null) return null;
	if (isValidElement(icon)) return icon;
	if (typeof icon === "function") {
		return createElement(icon as ComponentType<{ className?: string }>, {
			className,
		});
	}
	return <span className={className}>{icon as string}</span>;
}

export function MasteryToast({ feedback, themeId }: MasteryToastProps) {
	const { t } = useTranslation();
	const plugin = getMasteryPresentationPlugin(themeId);
	const ctx = { t };
	const stateMeta = plugin.getStateMeta(feedback.transition.afterState, ctx);
	const deltaFeedback = plugin.getDeltaFeedback(
		{
			transition: feedback.transition,
			rating: feedback.rating,
			isFirstLearn: feedback.isFirstLearn,
		},
		ctx,
	);

	return (
		<div className="fixed bottom-4 left-4 z-50 max-w-xs rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur animate-in slide-in-from-left-2 fade-in">
			<div className="flex items-start gap-2">
				<div className={cn("mt-0.5 text-base", stateMeta.colorClassName)}>
					{renderIcon(stateMeta.IconComponent ?? stateMeta.icon)}
				</div>
				<div className="min-w-0">
					<p className="text-sm font-medium leading-5">{deltaFeedback.title}</p>
					{deltaFeedback.subtitle ? (
						<p className="text-xs text-muted-foreground leading-4 mt-0.5">
							{deltaFeedback.subtitle}
						</p>
					) : null}
					<p className="text-xs text-muted-foreground leading-4 mt-1">
						{stateMeta.label} · {plugin.getProgressText(feedback.transition.afterScore, ctx)}
					</p>
				</div>
			</div>
		</div>
	);
}
