import { Button } from "@/components/ui/button";
import type { ReviewGrade } from "@/lib/scheduling/types";
import { cn } from "@/lib/utils";
import classes from "./review-buttons.module.css";
export type SimpleReviewResult = "forgot" | "remembered";

export type ReviewMode = "simple" | "sm2";

type BaseButtonConfig = {
	label: string;
	icon: string;
	subLabel?: string;
};

type SimpleButtonConfig = BaseButtonConfig & {
	result: SimpleReviewResult;
};

type Sm2ButtonConfig = BaseButtonConfig & {
	grade: ReviewGrade;
};

type ReviewButtonsProps =
	| {
			mode: "simple";
			buttons: SimpleButtonConfig[];
			onSelect: (result: SimpleReviewResult) => void;
			disabled?: boolean;
	  }
	| {
			mode: "sm2";
			buttons: Sm2ButtonConfig[];
			onSelect: (grade: ReviewGrade) => void;
			disabled?: boolean;
	  };

/**
 * Default configurations for review buttons
 */
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

export const defaultSm2Buttons: Sm2ButtonConfig[] = [
	{ grade: "again", label: "Forgot", icon: "❌", subLabel: "< 1m" },
	{ grade: "hard", label: "Partially Record", icon: "🤔", subLabel: "2d" },
	{ grade: "good", label: "Recalled with effort", icon: "🤭", subLabel: "3d" },
	{ grade: "easy", label: "Easily Recalled", icon: "👑", subLabel: "5d" },
];

/**
 * Generic review buttons component supporting multiple modes
 *
 * @example Simple mode (Quick Review)
 * ```tsx
 * <ReviewButtons
 *   mode="simple"
 *   buttons={defaultSimpleButtons}
 *   onSelect={(result) => console.log(result)}
 * />
 * ```
 *
 * @example SM-2 mode (Normal Review)
 * ```tsx
 * <ReviewButtons
 *   mode="sm2"
 *   buttons={defaultSm2Buttons}
 *   onSelect={(grade) => console.log(grade)}
 * />
 * ```
 */
export function ReviewButtons(props: ReviewButtonsProps) {
	const { mode, buttons, disabled } = props;

	const handleClick = (value: SimpleReviewResult | ReviewGrade) => {
		if (mode === "simple") {
			(props as Extract<ReviewButtonsProps, { mode: "simple" }>).onSelect(
				value as SimpleReviewResult,
			);
		} else {
			(props as Extract<ReviewButtonsProps, { mode: "sm2" }>).onSelect(
				value as ReviewGrade,
			);
		}
	};

	return (
		<div
			className={cn(
				"grid gap-1",
				mode === "simple" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
			)}
		>
			{buttons.map((config) => {
				const value =
					mode === "simple"
						? (config as SimpleButtonConfig).result
						: (config as Sm2ButtonConfig).grade;

				return (
					<Button
						key={value}
						variant={"outline"}
						disabled={disabled}
						onClick={() => handleClick(value)}
						className={cn("transition-colors", classes.button)}
					>
						<span className="flex flex-col items-center gap-1">
							{config.icon && <span className="text-2xl">{config.icon}</span>}
							<span className="pb-2">{config.label}</span>
							{config.subLabel && (
								<span
									className={cn(
										"text-xs",
										"text-muted-foreground",
										"border-1",
										"border-neutral-300",
										"py-1",
										"px-2",
									)}
								>
									{config.subLabel}
								</span>
							)}
						</span>
					</Button>
				);
			})}
		</div>
	);
}
